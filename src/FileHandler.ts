import {promisify} from "util";
import fs from "fs";
import {type HttpHandler, Uri} from "./http.ts";

const readFile = promisify(fs.readFile);

export function fileHandler(root: string = process.cwd()): HttpHandler {
    return async (request: Request) => {
        const path = new Uri(request.url);
        console.log("CWD", root, "path", path);
        try {
            const data = await readFile(root + path);
            return new Response(data, {status: 200})
        } catch (e: any) {
            return new Response(e.message, {status: 404})
        }
    };
}