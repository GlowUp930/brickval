#!/usr/bin/env python3
"""Compile production model/storage/router logic into a temporary macOS audit runner."""
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
app = root / 'apps/ios-swift/BrickVal'
sources = [
    'Core/Models/CollectionItem.swift', 'Core/Models/CollectionCondition.swift',
    'Core/Models/ItemType.swift', 'Core/Models/MarketHistoryPoint.swift', 'Core/Models/MarketRow.swift',
    'Core/Persistence/CollectionRepository.swift', 'Core/Persistence/CollectionStore.swift',
    'Core/Persistence/CollectionStoreError.swift', 'Core/Networking/LookupPricing.swift',
    'App/AppRouter.swift', 'App/AppRoute.swift', 'App/AppTab.swift',
    'Features/Collection/PortfolioHistoryBuilder.swift', 'Features/Collection/PortfolioHistoryPoint.swift',
    'Features/Collection/PortfolioHorizon.swift',
]
with tempfile.TemporaryDirectory(prefix='bv-native-audit-') as directory:
    executable = str(Path(directory) / 'audit')
    subprocess.run(['xcrun', 'swiftc', '-swift-version', '5', '-parse-as-library',
                    *[str(app / source) for source in sources],
                    str(root / 'scripts/audit/native_behaviors.swift'), '-o', executable], check=True)
    subprocess.run([executable], check=True)
