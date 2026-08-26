import Foundation

enum BulkScanSource: String, Codable, Sendable {
    case camera
    case photoLibrary
}

struct BrickValAPIClient: Sendable {
    var scanMinifigure: @Sendable (Data) async throws -> MinifigScanResult
    var scanBulkMinifigures: @Sendable (Data, [BulkScanRegion], BulkScanSource) async throws -> BulkMinifigScanPayload
    var startBulkScan: (@Sendable (Data, [BulkScanRegion], BulkScanSource) async throws -> BulkScanStartPayload)? = nil
    var identifyBulkRegion: (@Sendable (Data, String, String) async throws -> BulkRegionIdentificationPayload)? = nil
    var recoverBulkMinifigure: @Sendable (Data, String) async throws -> BulkRecoveryPayload
    var identify: @Sendable (Data, ScanMode, ScanIntent) async throws -> IdentificationResult
    var lookup: @Sendable (String, ItemType, Int?) async throws -> LookupResult
    var bulkLookupMinifigures: @Sendable ([String], BulkLookupSource) async throws -> BulkMinifigLookupResult
    var monetizationStatus: @Sendable () async throws -> MonetizationStatus
    var syncSubscription: @Sendable () async throws -> SubscriptionSyncResult
    var partColors: @Sendable () async throws -> [PartColorOption]
    var submitFeedback: @Sendable (MinifigFeedback) async throws -> Void
    var submitProductFeedback: @Sendable (ProductFeedbackSubmission) async throws -> Void
    var deleteAccount: @Sendable () async throws -> Void
    var registerNotificationDevice: @Sendable (BrickValNotificationDeviceRegistration) async throws -> Void
    var unregisterNotificationDevice: @Sendable (String) async throws -> Void
}

extension BrickValAPIClient {
    static func live(
        configuration: APIConfiguration = .live,
        session: URLSession = .shared,
        authToken: @escaping @Sendable () async -> String? = { nil }
    ) -> BrickValAPIClient {
        BrickValAPIClient(
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
                    return .matched(
                        identification: identification,
                        result: result.normalized,
                        timings: payload.timings,
                        usage: payload.usage
                    )
                case "review":
                    return .review(payload.detections ?? [], timings: payload.timings, usage: payload.usage)
                default:
                    return .notFound(timings: payload.timings)
                }
            },
            scanBulkMinifigures: { imageData, regions, source in
                var form = MultipartFormData()
                form.append(name: "image", filename: "bulk-scan.jpg", contentType: "image/jpeg", fileData: imageData)
                let encoder = JSONEncoder()
                let regionData = try encoder.encode(regions)
                guard let regionJSON = String(data: regionData, encoding: .utf8) else {
                    throw APIError(endpoint: "bulk minifig scan", statusCode: 0, serverMessage: "The scan regions could not be prepared.")
                }
                form.append(name: "regions", value: regionJSON)
                form.append(name: "scanSource", value: source.rawValue)
                form.finalize()
                var request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/bulk-scan",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                request.setValue(source.rawValue, forHTTPHeaderField: "X-BrickValue-Scan-Source")
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "bulk minifig scan"
                )
            },
            startBulkScan: { imageData, regions, source in
                var form = MultipartFormData()
                form.append(name: "image", filename: "bulk-scan.jpg", contentType: "image/jpeg", fileData: imageData)
                let encoder = JSONEncoder()
                let regionData = try encoder.encode(regions)
                guard let regionJSON = String(data: regionData, encoding: .utf8) else {
                    throw APIError(endpoint: "bulk minifig scan start", statusCode: 0, serverMessage: "The scan regions could not be prepared.")
                }
                form.append(name: "regions", value: regionJSON)
                form.append(name: "scanSource", value: source.rawValue)
                form.finalize()
                var request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/bulk-scan/start",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                request.setValue(source.rawValue, forHTTPHeaderField: "X-BrickValue-Scan-Source")
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(data: data, response: response, endpoint: "bulk minifig scan start")
            },
            identifyBulkRegion: { imageData, regionID, sessionToken in
                var form = MultipartFormData()
                form.append(name: "image", filename: "bulk-region.jpg", contentType: "image/jpeg", fileData: imageData)
                form.append(name: "regionId", value: regionID)
                form.append(name: "sessionToken", value: sessionToken)
                form.finalize()
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/bulk-scan/identify-region",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(data: data, response: response, endpoint: "bulk minifig region")
            },
            recoverBulkMinifigure: { imageData, recoveryToken in
                var form = MultipartFormData()
                form.append(name: "image", filename: "bulk-recovery.jpg", contentType: "image/jpeg", fileData: imageData)
                form.append(name: "recoveryToken", value: recoveryToken)
                form.finalize()
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/minifig/bulk-scan/recover",
                    method: "POST",
                    body: form.data,
                    contentType: form.contentType,
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(data: data, response: response, endpoint: "bulk minifigure recovery")
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
            bulkLookupMinifigures: { identifiers, source in
                let body = try JSONEncoder().encode(BulkMinifigLookupRequest(
                    mode: "minifig",
                    figNumbers: identifiers,
                    source: source.rawValue
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
                return BulkMinifigLookupResult(
                    rows: payload.results.map(\.normalized),
                    usage: payload.usage
                )
            },
            monetizationStatus: {
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/mobile/monetization",
                    method: "GET",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "monetization status"
                )
            },
            syncSubscription: {
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/mobile/subscription/sync",
                    method: "POST",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                return try decodeResponse(
                    data: data,
                    response: response,
                    endpoint: "subscription sync"
                )
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
            submitProductFeedback: { submission in
                let body = try JSONEncoder().encode(submission)
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/mobile/feedback/surveys",
                    method: "POST",
                    body: body,
                    contentType: "application/json",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "product feedback survey")
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
            },
            registerNotificationDevice: { registration in
                let body = try JSONEncoder().encode(registration)
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/mobile/notifications/devices",
                    method: "POST",
                    body: body,
                    contentType: "application/json",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "notification device registration")
            },
            unregisterNotificationDevice: { deviceID in
                let body = try JSONEncoder().encode(["deviceID": deviceID])
                let request = try await request(
                    baseURL: configuration.baseURL,
                    path: "/api/mobile/notifications/devices",
                    method: "DELETE",
                    body: body,
                    contentType: "application/json",
                    token: authToken()
                )
                let (data, response) = try await session.data(for: request)
                try validate(response: response, data: data, endpoint: "notification device removal")
            }
        )
    }
}

struct SubscriptionSyncResult: Decodable, Sendable {
    let verified: Bool
    let isPro: Bool
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
    if let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String {
        request.setValue(version, forHTTPHeaderField: "X-BrickValue-App-Version")
    }
    if let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String {
        request.setValue(build, forHTTPHeaderField: "X-BrickValue-App-Build")
    }
    request.setValue("ios", forHTTPHeaderField: "X-BrickValue-Platform")
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
        let payload = try? JSONDecoder().decode(ServerErrorPayload.self, from: data)
        throw APIError(
            endpoint: endpoint,
            statusCode: http.statusCode,
            serverMessage: payload?.message ?? payload?.error,
            feature: payload?.feature,
            usage: payload?.usage
        )
    }
}

private func append<T>(_ value: T?, name: String, to form: inout MultipartFormData) {
    if let value { form.append(name: name, value: String(describing: value)) }
}

private struct ServerErrorPayload: Decodable {
    let message: String?
    let error: String?
    let feature: ProFeature?
    let usage: UsageSnapshot?
}

private struct BulkMinifigLookupRequest: Encodable {
    let mode: String
    let figNumbers: [String]
    let source: String
}
