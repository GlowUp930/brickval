import Foundation

enum LegacyMigrationResult: Equatable, Sendable {
    case alreadyCompleted
    case migrated(itemCount: Int)
}
