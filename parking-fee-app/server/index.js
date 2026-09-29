import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { createWorker } from "tesseract.js";
import jpnData from "@tesseract.js-data/jpn";
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { structureParkingRule } from "./parkingRuleParser.js";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: [path.join(projectRoot, ".env.local"), path.join(projectRoot, ".env")] });
const app = express();
const port = Number(process.env.PORT) || 3001;
const maxImageBytes = 10 * 1024 * 1024;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxImageBytes, files: 1 },
});
let ocrWorkerPromise;
let ocrQueue = Promise.resolve();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));

const ocrRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "解析回数が上限に達しました。15分ほど待ってから再度お試しください。" },
});

function detectImageMime(buffer) {
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    return null;
}

function getOcrWorker() {
    if (!ocrWorkerPromise) {
        ocrWorkerPromise = (async () => {
            const worker = await createWorker("jpn", 1, {
                langPath: jpnData.langPath,
                gzip: jpnData.gzip,
                cacheMethod: "none",
            });
            await worker.setParameters({
                tessedit_pageseg_mode: "6",
                preserve_interword_spaces: "1",
            });
            return worker;
        })();
    }
    return ocrWorkerPromise;
}

async function prepareOcrVariants(imageBuffer) {
    const prepare = () => sharp(imageBuffer)
        .rotate()
        .resize({ width: 2400, height: 3200, fit: "inside" })
        .greyscale()
        .normalize();

    return Promise.all([
        prepare().sharpen().png().toBuffer(),
        prepare().threshold(170).png().toBuffer(),
    ]);
}

function scoreOcrResult(text, confidence = 0) {
    const normalized = normalizeOcrText(text);
    const count = (pattern) => (normalized.match(pattern) || []).length;
    return confidence / 50
        + count(/\d{1,2}\s*:\s*\d{1,2}/g) * 5
        + count(/\d+\s*円/g) * 6
        + count(/\d+\s*分/g) * 4
        + count(/昼|夜|最大|料金/g) * 2;
}

function normalizeOcrText(text) {
    return text.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
}

function extractText(imageBuffer) {
    const task = ocrQueue.then(async () => {
        const worker = await getOcrWorker();
        const imageVariants = await prepareOcrVariants(imageBuffer);
        const results = [];

        for (const [index, image] of imageVariants.entries()) {
            await worker.setParameters({ tessedit_pageseg_mode: index === 0 ? "6" : "11" });
            const result = await worker.recognize(image);
            results.push(result.data);
        }

        const bestResult = results.reduce((best, result) => (
            scoreOcrResult(result.text, result.confidence) > scoreOcrResult(best.text, best.confidence)
                ? result
                : best
        ));
        return bestResult.text || "";
    });
    ocrQueue = task.catch(() => undefined);
    return task;
}

app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
});

app.post("/api/ocr/extract", ocrRateLimit, upload.single("image"), async (request, response) => {
    if (!request.file) return response.status(400).json({ error: "画像ファイルを選択してください。" });

    const mimeType = detectImageMime(request.file.buffer);
    if (!mimeType) return response.status(415).json({ error: "PNG、JPEG、WebP形式の画像を選択してください。" });

    try {
        const rawText = await extractText(request.file.buffer);
        if (!rawText.trim() || !/[\p{L}\p{N}]/u.test(rawText)) {
            return response.status(422).json({ error: "文字を読み取れませんでした。明るい場所で料金表全体を撮影してください。" });
        }
        if (rawText.length > 20000) {
            return response.status(413).json({ error: "読み取った文字量が多すぎます。料金表だけが写るように撮影してください。" });
        }
        const rule = structureParkingRule(rawText);
        if (rule.dayPriceYen === null && rule.nightPriceYen === null && rule.maximumFeeYen === null) {
            return response.status(422).json({ error: "文字は認識しましたが、料金を読み取れませんでした。料金表を正面から大きく撮影し直してください。" });
        }
        response.json({ rule, rawText });
    } catch (error) {
        console.error("Local OCR processing failed:", error.message);
        return response.status(500).json({ error: "画像を解析できませんでした。" });
    }
});

app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return response.status(413).json({ error: "画像サイズは10MB以下にしてください。" });
    }
    if (error instanceof multer.MulterError) {
        return response.status(400).json({ error: "画像は1枚ずつ選択してください。" });
    }
    return response.status(500).json({ error: "サーバーエラーが発生しました。" });
});

const distDirectory = path.join(projectRoot, "dist");
app.use(express.static(distDirectory));
app.get(/.*/, (_request, response, next) => {
    response.sendFile(path.join(distDirectory, "index.html"), (error) => {
        if (error) next();
    });
});

app.listen(port, () => {
    console.log(`Parking fee API listening on http://localhost:${port}`);
});
