import { useEffect, useMemo } from "react";

type FileMap = Record<string, File | null | undefined>;
type UrlMap = Record<string, string | null>;

export function useObjectUrls(files: FileMap) {
    const urls: UrlMap = useMemo(() => {
        const map: UrlMap = {};

        Object.entries(files).forEach(([key, file]) => {
            map[key] = file ? URL.createObjectURL(file) : null;
        });

        return map;
    }, [files]);

    useEffect(() => {
        return () => {
            Object.values(urls).forEach((url) => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [urls]);

    return urls;
}
