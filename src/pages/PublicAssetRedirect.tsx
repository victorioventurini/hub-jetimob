// Legacy route handler - render PublicAsset directly for QR code compatibility
// URLs like /assets/0146 must work without redirects to avoid breaking existing QR codes
import PublicAsset from "./PublicAsset";

export default function PublicAssetRedirect() {
  // Render the public asset page directly instead of redirecting
  // This ensures /assets/:code works the same as /p/assets/:code
  return <PublicAsset />;
}
