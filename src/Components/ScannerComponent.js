import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function ScannerComponent({ onScan }) {
  const scannerRef = useRef(null);
  const containerId = 'scanner-container';
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      containerId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        console.log('✅ Scanned:', decodedText);
        onScan(decodedText);

        // Optionally auto-stop after one scan
        stopScanner();
      },
      (error) => {
        // Optional: console.warn("Scan error:", error);
      }
    );

    return () => {
      stopScanner();
    };
  }, [active, onScan]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
      setActive(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Scan Barcode:</h3>
      
      <button
        onClick={() => setActive(prev => !prev)}
        className={`px-4 py-2 rounded text-white ${active ? 'bg-red-600' : 'bg-blue-600'} hover:opacity-90`}
      >
        {active ? 'Stop Scanner' : 'Start Scanner'}
      </button>

      {active && <div id={containerId} className="mt-4 border rounded p-2"></div>}
    </div>
  );
}

export default ScannerComponent;
