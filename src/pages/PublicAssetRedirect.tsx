import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function PublicAssetRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Redirect to the public asset page
      navigate(`/p/assets/${code}`, { replace: true });
    }
  }, [code, navigate]);

  return null;
}
