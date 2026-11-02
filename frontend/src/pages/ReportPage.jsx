import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, MapPin, Loader2, RefreshCw, Users } from 'lucide-react';
import WasteDetectionCard from '../components/WasteDetectionCard';
import { classifyImage, submitComplaint, getAvailableWorkers } from '../services/api';

export default function ReportPage({ onSubmitSuccess, showToast }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('/uploads/sample_waste_dump.jpg');
  const [tempImageUrl, setTempImageUrl] = useState('/uploads/sample_waste_dump.jpg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoMessage, setDemoMessage] = useState(
    'Demo mode: sample detections shown because no YOLO API key is configured on the server.'
  );

  // Available workers from database
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Default detections matching reference screenshot
  const [detections, setDetections] = useState([
    { category: 'Plastic Bottle', count: 4, confidence: 0.94 },
    { category: 'Cardboard', count: 2, confidence: 0.88 },
    { category: 'Organic Waste', count: 1, confidence: 0.72 },
  ]);

  // Form details prefilled to match reference screenshot
  const [name, setName] = useState('Priya Nair');
  const [email, setEmail] = useState('priya@example.com');
  const [location, setLocation] = useState('12 MG Road, near the bus stop');
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    getAvailableWorkers()
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data);
        }
      })
      .catch((err) => console.error('Failed to load workers from database:', err));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size & type
    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP)', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be under 15MB', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Call classify API
    setIsAnalyzing(true);
    try {
      const result = await classifyImage(file);
      setIsDemoMode(result.is_demo);
      if (result.demo_message) {
        setDemoMessage(result.demo_message);
      }
      if (result.detections && result.detections.length > 0) {
        setDetections(result.detections);
      }
      if (result.temp_image_url) {
        setTempImageUrl(result.temp_image_url);
      }
      showToast('Waste analysis complete!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error classifying image. Using default detections.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation(`Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (GPS Location)`);
        setIsDetectingLocation(false);
        showToast('Location detected successfully!');
      },
      (err) => {
        setIsDetectingLocation(false);
        showToast(`Could not retrieve location: ${err.message}`, 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!location.trim()) {
      showToast('Please provide the waste dump location', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitComplaint({
        name,
        email,
        location,
        latitude: coords.lat,
        longitude: coords.lng,
        temp_image_url: tempImageUrl,
        imageFile: selectedFile,
        detections: detections,
        assigned_worker_id: selectedWorkerId ? parseInt(selectedWorkerId) : undefined,
      });

      if (response.success) {
        onSubmitSuccess({
          ticketId: response.public_id,
          workerName: response.assigned_worker_name,
        });
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '665px' }}>
      <div className="page-header">
        <h1 className="page-title">Report a waste dump in seconds</h1>
        <p className="page-subtitle">
          Upload a photo. Our AI identifies the waste and a worker is assigned automatically. No login needed.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Photo of the waste */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-number">1.</span>
            <span>Photo of the waste</span>
          </div>

          <div
            className="image-preview-container"
            style={{
              cursor: 'pointer',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              backgroundColor: '#374151',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Waste preview"
                className="image-preview-img"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                <UploadCloud size={44} style={{ margin: '0 auto 0.5rem', display: 'block', color: '#10B981' }} />
                <div style={{ fontWeight: 600, color: '#334155' }}>Click or drag photo here to upload</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Supports JPG, JPEG, PNG, WEBP (up to 15MB)</div>
              </div>
            )}

            {isAnalyzing && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  zIndex: 10,
                }}
              >
                <Loader2 size={32} className="spin-icon" style={{ color: '#10B981' }} />
                <span style={{ fontWeight: 600, color: '#064E3B', fontSize: '0.9rem' }}>
                  AI analyzing waste...
                </span>
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#334155',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ImageIcon size={14} />
              <span>Change photo</span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            style={{ display: 'none' }}
          />
        </div>

        {/* Section 2: Detected waste */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-number">2.</span>
            <span>Detected waste</span>
          </div>

          <div className="detected-grid">
            {detections.map((d, i) => (
              <WasteDetectionCard
                key={i}
                category={d.category}
                count={d.count}
                confidence={d.confidence}
              />
            ))}
          </div>

          {isDemoMode && (
            <div className="demo-mode-notice">
              {demoMessage}
            </div>
          )}
        </div>

        {/* Section 3: Your details */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-number">3.</span>
            <span>Your details</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location / address</label>
            <textarea
              className="form-textarea"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 12 MG Road, near the bus stop"
              required
            />
          </div>

          <div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 size={15} className="spin-icon" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <span style={{ color: '#EF4444' }}>📍</span>
                  <span>Detect current location</span>
                </>
              )}
            </button>
          </div>

          {/* Assign to specific worker or auto-assign */}
          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Assign to Sanitation Worker (Database)</span>
              {workers.length > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
                  {workers.length} {workers.length === 1 ? 'worker' : 'workers'} registered
                </span>
              )}
            </label>
            <select
              className="form-input"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              style={{ backgroundColor: '#FFFFFF', cursor: 'pointer' }}
            >
              <option value="">✨ Auto-assign to least-busy worker (Default)</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  👤 {w.name} (@{w.username}) — {w.open_jobs_count} active {w.open_jobs_count === 1 ? 'job' : 'jobs'}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.35rem' }}>
              Choose a specific registered worker from the database, or leave on auto-assign to balance work automatically.
            </div>
          </div>
        </div>

        {/* Full width Submit Complaint button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || isAnalyzing}
          style={{ height: '48px', fontSize: '1rem', marginTop: '0.5rem' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spin-icon" />
              <span>Submitting complaint...</span>
            </>
          ) : (
            <span>Submit complaint</span>
          )}
        </button>
      </form>

      <style>{`
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
