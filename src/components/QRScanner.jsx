import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, X, CheckCircle2, AlertCircle, Clock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import QrScanner from "qr-scanner";

const typeLabels = {
  trial: "Deneme Dersi",
  daily: "Günlük Giriş",
  member: "Üyelik"
};

const statusColors = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  frozen: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export default function QRScanner({ onClose }) {
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraActiveRef = useRef(false);

  const handleScan = async (qrData) => {
    const dataToScan = qrData || qrInput;
    if (!dataToScan.trim()) return;
    
    setLoading(true);
    try {
      const response = await base44.functions.invoke("scanQRCode", { qr_data: dataToScan });
      console.log("[QRScanner] Tarama fonksiyonu yanıtı:", response.data);
      setScanResult(response.data);
      setQrInput("");
      
      if (response.data.found) {
        toast.success("Kişi bulundu!");
      } else {
        toast.error(response.data.message || "Kişi bulunamadı");
      }
    } catch (err) {
      toast.error("Tarama hatası: " + err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const markAttended = async () => {
    if (!scanResult?.person) return;
    
    try {
      const { type, id } = scanResult.person;
      const entityMap = {
        trial: 'TrialApplication',
        daily: 'DailyVisit',
        member: 'Membership'
      };
      
      const entityName = entityMap[type];
      if (!entityName) return;
      
      await base44.entities[entityName].update(id, { attended: true });
      setScanResult({ ...scanResult, person: { ...scanResult.person, attended: true } });
      toast.success("Katılım işaretlendi");
    } catch (err) {
      toast.error("İşlem başarısız: " + err.message);
    }
  };

  const startCamera = async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Video yüklenince taramaya başla
        const onLoadedMetadata = () => {
          cameraActiveRef.current = true;
          setCameraActive(true);
          captureAndScanQR();
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.play().catch(e => console.error("[QRScanner] Video play hatası:", e));
      }
    } catch (err) {
      console.error("[QRScanner] Kamera hatası:", err.name, err.message);
      let errorMsg = "Kamera erişimi başarısız";
      
      if (err.name === "NotAllowedError") {
        errorMsg = "Kamera izni reddedildi. Browser ayarlarını kontrol edin.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "Cihazda kamera yok.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Kamera başka programda kullanılıyor.";
      }
      
      toast.error(errorMsg);
      setCameraActive(false);
      cameraActiveRef.current = false;
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    cameraActiveRef.current = false;
    setCameraActive(false);
  };

  const captureAndScanQR = () => {
    if (!cameraActiveRef.current || !videoRef.current || !canvasRef.current) {
      console.log("[QRScanner] Kamera hazır değil", { cameraActive: cameraActiveRef.current, video: !!videoRef.current, canvas: !!canvasRef.current });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    console.log("[QRScanner] Video boyutları:", { videoWidth: video.videoWidth, videoHeight: video.videoHeight });

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      // Capture current frame
      ctx.drawImage(video, 0, 0);
      console.log("[QRScanner] Frame yakalandı, taranıyor...");

      // Get image data and scan
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      QrScanner.scanImage(imageData, { returnDetailedScanResult: true })
        .then(result => {
          console.log("[QRScanner] Full tarama sonucu:", result);
          let qrData = null;
          
          // QrScanner sonucunun yapısına göre veriyi çıkar
          if (result?.data) {
            qrData = result.data;
          } else if (typeof result === 'string') {
            qrData = result;
          } else if (result?.innerCode?.rawValue) {
            qrData = result.innerCode.rawValue;
          }
          
          console.log("[QRScanner] Parsed QR data:", qrData);
          
          if (qrData) {
            console.log("[QRScanner] QR kodu bulundu:", qrData);
            stopCamera();
            setUseCamera(false);
            handleScan(qrData);
          } else {
            console.log("[QRScanner] QR kodu bulunamadı, tekrar deniyor...");
            if (cameraActiveRef.current) {
              setTimeout(captureAndScanQR, 300);
            }
          }
        })
        .catch(err => {
          console.log("[QRScanner] Tarama hatası, tekrar deniyor...", err);
          if (cameraActiveRef.current) {
            setTimeout(captureAndScanQR, 300);
          }
        });
    } catch (err) {
      console.error("[QRScanner] Frame yakalanamadı:", err);
      if (cameraActiveRef.current) {
        setTimeout(captureAndScanQR, 300);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="w-full bg-card rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">QR Tarama</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
           {!useCamera ? (
             <div className="flex gap-2">
               <Input
                 ref={inputRef}
                 value={qrInput}
                 onChange={(e) => setQrInput(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleScan()}
                 placeholder="QR kodunu tarayın..."
                 autoFocus
                 style={{ fontSize: "16px" }}
               />
               <Button onClick={handleScan} disabled={loading || !qrInput.trim()} size="icon">
                 <Zap className="w-4 h-4" />
               </Button>
               <Button onClick={() => setUseCamera(true)} variant="outline" size="icon">
                 <Camera className="w-4 h-4" />
               </Button>
             </div>
           ) : (
             <div className="space-y-2">
               <video
                 ref={videoRef}
                 autoPlay
                 playsInline
                 className="w-full rounded-lg bg-black"
                 style={{ aspectRatio: "16/9" }}
               />

               <Button
                 onClick={() => {
                   stopCamera();
                   setUseCamera(false);
                 }}
                 variant="destructive"
                 className="w-full"
               >
                 İptal Et
               </Button>
             </div>
           )}
           {useCamera && (
             <>
               <canvas ref={canvasRef} style={{ display: "none" }} />
               {!cameraActive && (
                 <Button onClick={startCamera} className="w-full gap-2">
                   <Camera className="w-4 h-4" />
                   Kamerayı Başlat
                 </Button>
               )}
             </>
           )}

          {scanResult && (
            <Card className="p-4 space-y-3">
              {scanResult.found ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{scanResult.person.fullName}</p>
                      <p className="text-sm text-muted-foreground">{scanResult.person.phone}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[scanResult.person.status || scanResult.person.type]}>
                      {typeLabels[scanResult.person.type]}
                    </Badge>
                  </div>

                  {scanResult.person.type === 'trial' && (
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p><span className="font-semibold">Durum:</span> {scanResult.person.status === 'approved' ? '✅ Onaylandı' : scanResult.person.status === 'rejected' ? '❌ Reddedildi' : '⏳ Bekleniyor'}</p>
                      <p><span className="font-semibold">Ders:</span> {scanResult.person.trialClass}</p>
                      <p><span className="font-semibold">Tarih:</span> {scanResult.person.trialDate ? format(parseISO(scanResult.person.trialDate), "d MMMM", { locale: tr }) : '-'}</p>
                      <p><span className="font-semibold">Saat:</span> {scanResult.person.trialTime}</p>
                    </div>
                  )}

                  {scanResult.person.type === 'daily' && (
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p><span className="font-semibold">Giriş Tarihi:</span> {scanResult.person.visitDate ? format(parseISO(scanResult.person.visitDate), "d MMMM", { locale: tr }) : '-'}</p>
                      <p><span className="font-semibold">Ders:</span> {scanResult.person.class || '-'}</p>
                      <p><span className="font-semibold">Saat:</span> {scanResult.person.classTime || '-'}</p>
                    </div>
                  )}

                  {scanResult.person.type === 'member' && (
                    <>
                      <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                        <p><span className="font-semibold">Kullanıcı Adı:</span> {scanResult.person.username}</p>
                        <p><span className="font-semibold">Durum:</span> {scanResult.person.status === 'active' ? '✅ Aktif' : scanResult.person.status}</p>
                        <p><span className="font-semibold">Plan:</span> {scanResult.person.planName}</p>
                        <p><span className="font-semibold">Bitiş:</span> {scanResult.person.endDate ? format(parseISO(scanResult.person.endDate), "d MMMM yyyy", { locale: tr }) : '-'}</p>
                      </div>
                      {scanResult.classDate && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm space-y-1">
                          <p className="font-semibold text-blue-700">Bu Ders İçin:</p>
                          {scanResult.person.className && <p><span className="font-semibold">Ders:</span> {scanResult.person.className}</p>}
                          <p><span className="font-semibold">Tarih:</span> {format(parseISO(scanResult.classDate), "d MMMM", { locale: tr })}</p>
                          {scanResult.classTime && <p><span className="font-semibold">Saat:</span> {scanResult.classTime}</p>}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    {!scanResult.person.attended ? (
                      <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={markAttended}>
                        <CheckCircle2 className="w-4 h-4" />
                        Katılımı İşaretle
                      </Button>
                    ) : (
                      <div className="w-full bg-green-500/10 border border-green-500/30 rounded-md p-3 text-center text-sm text-green-600 font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Katılımı İşaretlendi
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-muted-foreground">{scanResult.message}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}