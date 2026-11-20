import Foundation
import SwiftUI
import AuthenticationServices
import Security
import DhunCore

private final class NoAccountRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
@MainActor final class CloudAccount: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    @Published var name = ""
    @Published var email = ""
    @Published var connected = false
    @Published var busy = false
    @Published var activityEnabled = false
    @Published var message: String?
    private let session = URLSession(configuration: .ephemeral, delegate: NoAccountRedirects(), delegateQueue: nil)
    private let origin = "https://dhun-cloud.vercel.app"
    private let keychainService = "io.github.jaitak2121spec.dhun.ios"
    private var browser: ASWebAuthenticationSession?
    private var reporting = false
    override init() { super.init(); connected = (try? token()) != nil }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
    private func token() throws -> String? {
        var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keychainService, kSecAttrAccount as String: "session"]
        query[kSecReturnData as String] = true; var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else { throw DhunError.message("Your secure account could not be opened. Sign in again.") }; return value
    }
    private func saveToken(_ value: String) throws {
        guard value.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { throw DhunError.message("Invalid sign-in response.") }
        clearToken()
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keychainService, kSecAttrAccount as String: "session", kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw DhunError.message("Your secure account could not be saved.") }
    }
    private func clearToken() { SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keychainService, kSecAttrAccount as String: "session"] as CFDictionary) }
    private func api(_ action: String, _ body: [String: Any]? = nil, authenticated: Bool = true) async throws -> [String: Any] {
        var request = URLRequest(url: URL(string: "\(origin)/api/cloud/\(action)")!, timeoutInterval: 15)
        if authenticated { guard let secret = try token() else { throw DhunError.message("Sign in to Dhun first.") }; request.setValue("Bearer \(secret)", forHTTPHeaderField: "Authorization") }
        if let body { request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await session.data(for: request)
        guard data.count <= 2_000_000, let http = response as? HTTPURLResponse, let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw DhunError.message("Dhun accounts are temporarily unavailable.") }
        if http.statusCode == 401 && authenticated { clearToken(); connected = false; name = ""; email = ""; activityEnabled = false }
        guard (200...299).contains(http.statusCode) else { throw DhunError.message(json["error"] as? String ?? "Please try again.") }; return json
    }
    func refresh() async {
        guard connected else { return }
        do { let response = try await api("device-account"); guard let account = response["account"] as? [String: Any] else { return }; name = account["name"] as? String ?? ""; email = account["email"] as? String ?? ""; activityEnabled = account["activityEnabled"] as? Bool == true; await foreground() } catch { message = error.localizedDescription }
    }
    func signIn() async {
        guard !busy, !connected else { return }; busy = true; message = nil
        do {
            let start = try await api("connect-start", ["name": "Dhun iPhone", "handoff": true, "platform": "ios"], authenticated: false)
            guard let code = start["userCode"] as? String, code.range(of: "^[A-F0-9]{8}$", options: .regularExpression) != nil, let secret = start["deviceCode"] as? String, let value = start["verificationUrl"] as? String, value == "\(origin)/connect?code=\(code)", let url = URL(string: value) else { throw DhunError.message("Start sign-in again.") }
            browser = ASWebAuthenticationSession(url: url, callbackURLScheme: "dhun-ios") { [weak self] callback, error in
                Task { @MainActor in
                    guard let self else { return }; defer { self.busy = false; self.browser = nil }
                    if let error { if (error as? ASWebAuthenticationSessionError)?.code != .canceledLogin { self.message = error.localizedDescription }; return }
                    do {
                        guard let callback, let parts = URLComponents(url: callback, resolvingAgainstBaseURL: false), parts.scheme == "dhun-ios", parts.host == "account", parts.path == "/return", parts.fragment == nil, parts.queryItems?.count == 1, parts.queryItems?.first?.name == "grant", let grant = parts.queryItems?.first?.value, grant.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { throw DhunError.message("Invalid sign-in return. Please start again.") }
                        let result = try await self.api("connect-poll", ["deviceCode": secret, "grant": grant], authenticated: false)
                        guard let token = result["token"] as? String else { throw DhunError.message("Sign-in wasn't completed. Please try again.") }
                        try self.saveToken(token); self.connected = true; UserDefaults.standard.removeObject(forKey: "accountActivityDay"); await self.refresh()
                    } catch { self.message = error.localizedDescription }
                }
            }
            browser?.presentationContextProvider = self
            if browser?.start() != true { browser = nil; busy = false; throw DhunError.message("Couldn't open secure sign-in.") }
        } catch { busy = false; message = error.localizedDescription }
    }
    func setActivity(_ enabled: Bool) async {
        do { _ = try await api("device-activity-consent", ["agree": enabled, "policyVersion": "2026-11-19"]); activityEnabled = enabled; UserDefaults.standard.removeObject(forKey: "accountActivityDay"); if enabled { await foreground() } } catch { message = error.localizedDescription }
    }
    func foreground() async {
        guard connected, activityEnabled, !reporting else { return }; reporting = true; defer { reporting = false }
        let day = Int(Date().timeIntervalSince1970 / 86400), version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0", key = "\(day):\(version)"
        guard UserDefaults.standard.string(forKey: "accountActivityDay") != key else { return }
        do { let response = try await api("device-activity", ["platform": "ios", "version": version]); activityEnabled = response["enabled"] as? Bool == true; UserDefaults.standard.set(key, forKey: "accountActivityDay") } catch { /* Nonessential reporting never interrupts playback. */ }
    }
    func signOut() async {
        do { _ = try await api("device-disconnect", [:]); clearToken(); connected = false; activityEnabled = false; name = ""; email = ""; UserDefaults.standard.removeObject(forKey: "accountActivityDay") } catch { message = error.localizedDescription }
    }
}
