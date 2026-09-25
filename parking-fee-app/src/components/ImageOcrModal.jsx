import { useState, useRef } from "react";

export function ImageOcrModal({ isOpen, onClose, onApplyRule }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);

    const cameraInputRef = useRef(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // 画像の自動圧縮とプレビュー生成
    const processImage = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 1200;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL("image/jpeg", 0.85);
                setPreviewUrl(compressed);
                analyzeImage(compressed);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 画像のAI/OCR解析（モック兼API対応）
    const analyzeImage = async (base64) => {
        setIsAnalyzing(true);
        // AI解析をシミュレート (1.2秒)
        await new Promise((r) => setTimeout(r, 1200));

        // 料金表看板から抽出されたデータ
        setExtractedData({
            ruleName: "タイムズ〇〇駅前第2パーキング",
            dayPrice: 220, // 30分220円
            nightPrice: 110, // 60分110円
            maximumFee: 1200, // 入庫後24時間最大1200円
            confidence: 0.95,
            notes: "8:00〜20:00 30分220円 / 20:00〜8:00 60分110円 / 24時間最大1200円",
        });
        setIsAnalyzing(false);
    };

    const handleApply = () => {
        if (!extractedData) return;
        onApplyRule(extractedData);
        handleClose();
    };

    const handleClose = () => {
        setPreviewUrl(null);
        setExtractedData(null);
        setIsAnalyzing(false);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>📷 料金表看板の写真を読み取る</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn-icon"
                    >
                        ✕
                    </button>
                </div>

                <p className="modal-desc">
                    駐車場の料金看板を撮影するか、画像を選択すると、昼夜料金や最大料金を自動で読み取ります。
                </p>

                {/* 非表示input */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) =>
                        e.target.files?.[0] && processImage(e.target.files[0])
                    }
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                        e.target.files?.[0] && processImage(e.target.files[0])
                    }
                />

                {/* 撮影・選択ボタン */}
                <div className="button-group">
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                    >
                        📷 カメラで撮影
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary"
                    >
                        🖼️ アルバムから選択
                    </button>
                </div>

                {/* プレビュー画像 */}
                {previewUrl && (
                    <div className="ocr-preview-box">
                        <img
                            src={previewUrl}
                            alt="看板プレビュー"
                            className="ocr-preview-img"
                        />
                    </div>
                )}

                {/* ローディング */}
                {isAnalyzing && (
                    <div className="ocr-loading">
                        <span className="spinner">⏳</span>{" "}
                        AIが料金表を解析しています...
                    </div>
                )}

                {/* 解析結果の確認・修正フォーム */}
                {extractedData && !isAnalyzing && (
                    <div className="ocr-result-card">
                        <div className="notice-message">
                            ✓ 料金情報を読み取りました！内容を確認・修正してください。
                        </div>

                        <div className="ocr-edit-grid">
                            <div>
                                <label>駐車場名</label>
                                <input
                                    type="text"
                                    value={extractedData.ruleName}
                                    onChange={(e) =>
                                        setExtractedData({
                                            ...extractedData,
                                            ruleName: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label>昼料金（30分あたり / 円）</label>
                                <input
                                    type="number"
                                    value={extractedData.dayPrice}
                                    onChange={(e) =>
                                        setExtractedData({
                                            ...extractedData,
                                            dayPrice: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label>夜料金（60分あたり / 円）</label>
                                <input
                                    type="number"
                                    value={extractedData.nightPrice}
                                    onChange={(e) =>
                                        setExtractedData({
                                            ...extractedData,
                                            nightPrice: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label>最大料金（円）</label>
                                <input
                                    type="number"
                                    value={extractedData.maximumFee}
                                    onChange={(e) =>
                                        setExtractedData({
                                            ...extractedData,
                                            maximumFee: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="button-group" style={{ marginTop: "16px" }}>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="btn-primary"
                            >
                                ✨ この内容を計算フォームに反映する
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn-secondary"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
