import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	css: {
		postcss: "./postcss.config.js",
	},
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "index.html"),
				papasConPan: path.resolve(__dirname, "papas-con-pan/index.html"),
			},
		},
	},
	base: "/creador-horarios/",
	server: {
		host: true,
		port: 5173,
	},
});
