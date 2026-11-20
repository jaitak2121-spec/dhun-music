// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "DhunCore", platforms: [.iOS(.v17), .macOS(.v13)], products: [.library(name: "DhunCore", targets: ["DhunCore"])], targets: [.target(name: "DhunCore"), .testTarget(name: "DhunCoreTests", dependencies: ["DhunCore"])])
