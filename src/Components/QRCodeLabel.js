import React from 'react';
import QRCode from 'qrcode';

const QRCodeLabel = React.forwardRef(({ sku, name, unit, location, diningUnit }, ref) => {
  const canvasRef = React.useRef();

  React.useEffect(() => {
    if (canvasRef.current && sku) {
      QRCode.toCanvas(canvasRef.current, sku, { width: 100 }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [sku]);

  return (
    <div ref={ref} className="p-2 border w-fit text-sm bg-white">
      <canvas ref={canvasRef} />
      <div><strong>{name}</strong></div>
      <div>SKU: {sku}</div>
      {unit && <div>Unit: {unit}</div>}
      {location && <div>Location: {location}</div>}
      {diningUnit && <div>Dining Unit: {diningUnit}</div>}
    </div>
  );
});

export default QRCodeLabel;
