import Foundation
import Security

enum InstallationIdentity {
    private static let account = "installation"
    private static let legacyDefaultsKey = "brickvalue_feedback_installation_id"

    static func current(defaults: UserDefaults = .standard) -> String {
        if let stored = readKeychain(), !stored.isEmpty {
            return stored
        }

        if let legacy = defaults.string(forKey: legacyDefaultsKey), !legacy.isEmpty {
            saveToKeychain(legacy)
            return legacy
        }

        let generated = UUID().uuidString
        saveToKeychain(generated)
        return generated
    }

    private static var service: String {
        Bundle.main.bundleIdentifier ?? "com.brickval.app"
    }

    private static func readKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else { return nil }
        return value
    }

    private static func saveToKeychain(_ value: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let attributes: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            item[kSecValueData as String] = data
            SecItemAdd(item as CFDictionary, nil)
        }
    }
}
