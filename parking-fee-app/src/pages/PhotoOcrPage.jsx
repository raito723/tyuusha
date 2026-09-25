import { useEffect, useState } from "react";

export function PhotoOcrPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl("");
            return;
        }

        const imageUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(imageUrl);

        return () => {
            URL.revokeObjectURL(imageUrl);
        };
    }, [selectedFile]);

    function handleFileChange(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setMessage("画像ファイルを選択してください。");
            setSelectedFile(null);
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setMessage("画像サイズは10MB以下にしてください。");
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
        setMessage("");
    }

    function handleRemoveImage() {
        setSelectedFile(null);
        setMessage("");
    }

    return (
        <section>
            <h2>料金表を読み取る</h2>
            <p>駐車場の料金表を撮影、または画像を選択してください。</p>

            <section className="photo-card">
                <label htmlFor="parking-fee-image" className="file-select-button">
                    料金表の写真を選択する
                </label>

                <input
                    id="parking-fee-image"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                />

                <p className="help-message">
                    JPG、PNGなどの画像を選択できます。画像サイズは10MB以下です。
                </p>

                {message && <p className="error-message">{message}</p>}

                {previewUrl && (
                    <div className="image-preview">
                        <h3>選択した料金表</h3>

                        <img src={previewUrl} alt="選択した駐車料金表" />

                        <p>ファイル名：{selectedFile.name}</p>

                        <button type="button" onClick={handleRemoveImage}>
                            この写真を取り消す
                        </button>
                    </div>
                )}
            </section>

            <section className="ocr-next-step">
                <h3>次の工程</h3>
                <p>
                    次の工程で、この写真をOCRサービスへ送り、駐車場名・料金・最大料金を読み取れるようにします。
                </p>
            </section>
        </section>
    );
}