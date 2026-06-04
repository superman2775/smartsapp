import { useState, useCallback, useRef } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import styles from './ImageCropper.module.css';

interface Props {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      0.9
    );
  });
}

export default function ImageCropper({ file, onCrop, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const objectUrl = useRef(URL.createObjectURL(file));

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(objectUrl.current, croppedAreaPixels);
      URL.revokeObjectURL(objectUrl.current);
      onCrop(blob);
    } catch {
      // Silently fail — parent handles the error
    }
  };

  const handleCancel = () => {
    URL.revokeObjectURL(objectUrl.current);
    onCancel();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.cropContainer}>
        <Cropper
          image={objectUrl.current}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      <div className={styles.controls}>
        <label className={styles.zoomLabel}>Zoom</label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className={styles.zoomSlider}
        />
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
          Use this photo
        </button>
      </div>
    </div>
  );
}
