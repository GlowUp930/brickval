import Foundation
import Security

struct LegacyKeychainReader: Sendable {
    private let services = ["app:no-auth", "app:auth", "app"]

    func string(for key: String) -> String? {
        for service in services {
            if let value = read(service: service, key: key, attribute: kSecAttrAccount) { return value }
            if let value = read(service: service, key: key, attribute: kSecAttrGeneric) { return value }
        }
        return nil
    }

    private func read(service: String, key: String, attribute: CFString) -> String? {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        query[attribute] = attribute == kSecAttrGeneric ? Data(key.utf8) : key

        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
