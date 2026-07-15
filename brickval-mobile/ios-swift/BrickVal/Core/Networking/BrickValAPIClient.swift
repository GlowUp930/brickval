import Foundation

struct BrickValAPIClient: Sendable {
    var detectMinifigures: @Sendable (Data) async throws -> HostedDetectionResult
    var scanMinifigure: @Sendable (Data) async throws -> MinifigScanResult
    var identify: @Sendable (Data, ScanMode, ScanIntent) async throws -> IdentificationResult
    var lookup: @Sendable (String, ItemType, Int?) async throws -> LookupResult
    var bulkLookupMinifigures: @Sendable ([String]) async throws -> [BulkMinifigLookupRow]
    var partColors: @Sendable () async throws -> [PartColorOption]
    var submitFeedback: @Sendable (MinifigFeedback) async throws -> Void
    var deleteAccount: @Sendable () async throws -> Void
}

extension BrickValAPIClient {
    static func live(
        configuration: APIConfiguration = .live,
        session: URLSession = .shared,
        authToken: @escaping @Sendable () async -> String? = { nil }
    ) -> BrickValAPIClient {
        BrickValAPIClient(
            detectMinifigures: { imageData in
                var form = MultipartFormData()
                form.append(name: "image", filename: "detection.jpg", contentType: "image/jpeg", fileData: imageData)
                form.finalize()
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/detect",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                let payload: HostedDetectionPayload = try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "minifig detect",
                    allowingStatus: [200, 429]
                )
                if payload.status == "cap-reached" {
                    return .capReached(modelVersion: payload.detectorModelVersion)
                }
                return .available(
                    modelVersion: payload.detectorModelVersion,
                    detectionMilliseconds: payload.detectMs,
                    observations: payload.observations
                )
            },
            scanMinifigure: { imageData in
                var form = MultipartFormData()
                form.append(name: "image", filename: "scan.jpg", contentType: "image/jpeg", fileData: imageData)
                form.finalize()
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/scan",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                let payload: MinifigScanPayload = try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "minifig scan"
                )
                switch payload.status {
                case "matched":
                    guard let identification = payload.identification, let result = payload.result else {
                        throw APIError(endpoint: "minifig scan", statusCode: 502, serverMessage: "The scan response was incomplete.")
                    }
                    return .matched(identification: identification, result: result.normalized)
                case "review": return .review(payload.detections ?? [])
                default: return .notFound
                }
            },
            identify: { imageData, mode, intent in
                var form = MultipartFormData()
                form.append(name: "image", filename: "scan.jpg", contentType: "image/jpeg", fileData: imageData)
                form.finalize()
                let scan = intent == .bulk ? "bulk" : "guided-single"
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/identify?mode=\(mode.rawValue)&scan=\(scan)",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(data: data, response: response, endpoint: "identify")
            },
            lookup: { identifier, type, colorID in
                struct LookupRequest: Encodable {
                    let setNumber: String
                    let mode: String
                    let colorId: Int?
                }
                let body = try JSONEncoder().encode(LookupRequest(
                    setNumber: identifier,
                    mode: type.rawValue,
                    colorId: colorID
                ))
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/lookup",
                    method: "POST",
                    body: body,
                    contentType: "application/json",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "lookup")
                let decoder = makeDecoder()
                switch type {
                case .set:
                    return try decoder.decode(SetLookupPayload.self, from: data).normalized(fallbackIdentifier: identifier)
                case .minifig:
                    return try decoder.decode(MinifigLookupPayload.self, from: data).normalized
                case .part:
                    return try decoder.decode(PartLookupPayload.self, from: data).normalized
                }
            },
            bulkLookupMinifigures: { identifiers in
                let body = try JSONEncoder().encode(BulkMinifigLookupRequest(
                    mode: "minifig",
                    figNumbers: Array(identifiers.prefix(40))
                ))
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/bulk-lookup",
                    method: "POST",
                    body: body,
                    contentType: "application/json",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                let payload: BulkMinifigLookupPayload = try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "bulk minifig lookup"
                )
                return payload.results.map(\.normalized)
            },
            partColors: {
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/part-colors",
                    method: "GET",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                let payload: PartColorsPayload = try decodeResponse(data: data, response: response, endpoint: "part colors")
                return payload.colors
            },
            submitFeedback: { feedback in
                var form = MultipartFormData()
                form.append(name: "outcome", value: feedback.outcome.rawValue)
                form.append(name: "consent", value: feedback.consent ? "true" : "false")
                append(feedback.detectorModelVersion, name: "detectorModelVersion", to: &form)
                append(feedback.detectorConfidence, name: "detectorConfidence", to: &form)
                append(feedback.brickognizeID, name: "brickognizeId", to: &form)
                append(feedback.brickognizeScore, name: "brickognizeScore", to: &form)
                append(feedback.detectionMilliseconds, name: "detectMs", to: &form)
                append(feedback.identificationMilliseconds, name: "identifyMs", to: &form)
                append(feedback.pricingMilliseconds, name: "pricingMs", to: &form)
                append(feedback.totalMilliseconds, name: "totalMs", to: &form)
                if feedback.consent, let imageData = feedback.imageData {
                    form.append(name: "image", filename: "feedback.jpg", contentType: "image/jpeg", fileData: imageData)
                }
                form.finalize()
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/feedback",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "minifig feedback")
            },
            deleteAccount: {
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/delete-account",
                    method: "POST",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "delete account")
            }
        )
    }
}

private func request(
    baseURL: URL,
    path: String,
    method: String,
    body: Data? = nil,
    contentType: String? = nil,
    token: String? = nil
) throws -> URLRequest {
    guard let url = URL(string: path, relativeTo: baseURL) else {
        throw APIError(endpoint: path, statusCode: 0, serverMessage: "The server address is invalid.")
    }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.httpBody = body
    request.timeoutInterval = 30
    if let contentType { request.setValue(contentType, forHTTPHeaderField: "Content-Type") }
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    return request
}

private func makeDecoder() -> JSONDecoder {
    JSONDecoder()
}

private func decodeResponse<T: Decodable>(
    data: Data,
    response: URLResponse,
    endpoint: String,
    allowingStatus: Set<Int> = [200]
) throws -> T {
    try validate(response: response, data: data, endpoint: endpoint, allowingStatus: allowingStatus)
    return try makeDecoder().decode(T.self, from: data)
}

private func validate(
    response: URLResponse,
    data: Data,
    endpoint: String,
    allowingStatus: Set<Int> = [200]
) throws {
    guard let http = response as? HTTPURLResponse else {
        throw APIError(endpoint: endpoint, statusCode: 0, serverMessage: "The server returned an invalid response.")
    }
    guard allowingStatus.contains(http.statusCode) else {
        let message = (try? JSONDecoder().decode(ServerErrorPayload.self, from: data))?.message
        throw APIError(endpoint: endpoint, statusCode: http.statusCode, serverMessage: message)
    }
}

private func append<T>(_ value: T?, name: String, to form: inout MultipartFormData) {
    if let value { form.append(name: name, value: String(describing: value)) }
}

private struct ServerErrorPayload: Decodable {
    let message: String?
}

private struct BulkMinifigLookupRequest: Encodable {
    let mode: String
    let figNumbers: [String]
}
