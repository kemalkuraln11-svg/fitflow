import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function QRCodeDisplay({ data }) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    // Generate QR code data string with maximum error correction for instant scanning
    const qrData = encodeURIComponent(data);
    // Use largest size (500x500), maximum error correction (L), margin for better detection
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&format=png&error_correction=L&margin=2&data=${qrData}`);
  }, [data]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {qrUrl && (
         <div className="flex justify-center">
           <img src={qrUrl} alt="QR Code" className="w-80 h-80 border-4 border-primary rounded-lg p-2 bg-white shadow-lg" />
         </div>
       )}
      <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground break-all space-y-2">
        <p className="font-semibold text-foreground">QR Veri:</p>
        <p className="font-mono">{data}</p>
      </div>
      <Button variant="outline" className="w-full gap-2" onClick={copyToClipboard}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Kopyalandı!" : "Veri Kopyala"}
      </Button>
    </div>
  );
}