// Lattice Flight — Originkit

"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

const DPR_MIN = 1;

const DPR_CAP = 1.5;

const MAX_STEPS = 80;

const ESCAPE_STEPS = 16;
const ESCAPE_EPS = 0.002;

const HIT_EPS = 0.001;
const FAR_CLIP = 100.0;

const FLOW_AT_50 = 0.3;

const FOG_AT_100 = 0.09;

const CELL_HALF = 0.5;

const VERT = `
precision highp float;
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

#define MAX_STEPS ${MAX_STEPS}
#define ESCAPE_STEPS ${ESCAPE_STEPS}

uniform vec2  uBuf;
uniform vec2  uRes;
uniform vec2  uAngles;
uniform float uFlow;
uniform float uScale;
uniform float uThick;
uniform float uDist;
uniform float uFog;
uniform vec3  uBase;

mat2 rot2D(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float sdBoxFrame(vec3 p, vec3 b, float e) {
       p = abs(p)-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

float map(vec3 p) {
    vec3 c = p * uScale;
    c.z += uFlow;
    vec3 q = fract(c) - 0.5;
    return sdBoxFrame(q, vec3(${CELL_HALF.toFixed(3)}), uThick) / uScale;
}

void main() {
    vec2 coord = vec2(gl_FragCoord.x / uBuf.x, 1.0 - gl_FragCoord.y / uBuf.y);
    vec2 uv = (coord * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);

    vec3 ro = vec3(0.0, 0.0, -uDist);
    vec3 rd = normalize(vec3(uv, 1.0));

    ro.yz *= rot2D(-uAngles.y);
    rd.yz *= rot2D(-uAngles.y);
    ro.xz *= rot2D(-uAngles.x);
    rd.xz *= rot2D(-uAngles.x);

    float t = 0.0;
    for (int i = 0; i < ESCAPE_STEPS; i++) {
        float d = map(ro + rd * t);
        if (d > 0.0) break;
        t += -d + ${ESCAPE_EPS.toFixed(4)};
    }

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        t += d;
        if (d < ${HIT_EPS.toFixed(4)} || t > ${FAR_CLIP.toFixed(1)}) break;
    }

    float a = clamp(t * uFog, 0.0, 1.0);
    gl_FragColor = vec4(uBase * a, a);
}
`;

function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0];
    const s = input.trim();
    const fn = s.match(/rgba?\(([^)]+)\)/i);
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()));
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255];
    }
    let h = s.replace("#", "");
    if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("");
    h = h.padEnd(6, "0");
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn("LatticeFlight shader:", gl.getShaderInfoLog(sh));
    return sh;
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn("LatticeFlight link:", gl.getProgramInfoLog(prog));
    return prog;
}

interface CameraGroup {
    yaw?: number;
    pitch?: number;
}

const CAMERA_DEFAULTS: Required<CameraGroup> = { yaw: -43, pitch: 65 };

interface Props {
    background?: string;
    baseColor?: string;
    density?: number;
    speed?: number;
    thickness?: number;
    fog?: number;
    distance?: number;
    camera?: CameraGroup;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
}

export default function LatticeFlight(props: Props) {
    const {
        background = "#000000",
        baseColor = "rgb(0, 255, 255)",
        density = 307,
        speed = 27,
        thickness = 4,
        fog = 100,
        distance = 3,
        camera,
        style,
    } = props;

    const cam: Required<CameraGroup> = { ...CAMERA_DEFAULTS, ...(camera || {}) };

    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const dragAngles = useRef<{ x: number; y: number } | null>(null);

    const live = useRef({
        baseColor,
        density,
        speed,
        thickness,
        fog,
        distance,
        yaw: cam.yaw,
        pitch: cam.pitch,
    });
    useEffect(() => {
        live.current = {
            baseColor,
            density,
            speed,
            thickness,
            fog,
            distance,
            yaw: cam.yaw,
            pitch: cam.pitch,
        };
    }, [baseColor, density, speed, thickness, fog, distance, cam.yaw, cam.pitch]);

    useEffect(() => {
        dragAngles.current = null;
    }, [cam.yaw, cam.pitch]);

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: false,
        }) as WebGLRenderingContext | null;
        if (!gl) return;

        const prog = linkProg(gl, VERT, FRAG);
        gl.useProgram(prog);

        const aPos = gl.getAttribLocation(prog, "aPos");
        const U = (n: string) => gl.getUniformLocation(prog, n);
        const u = {
            buf: U("uBuf"),
            res: U("uRes"),
            angles: U("uAngles"),
            flow: U("uFlow"),
            scale: U("uScale"),
            thick: U("uThick"),
            dist: U("uDist"),
            fog: U("uFog"),
            base: U("uBase"),
        };

        const tri = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, tri);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        );
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        let cssW = 0;
        let cssH = 0;
        let dpr = 1;
        const resize = () => {
            dpr = Math.min(Math.max(window.devicePixelRatio || 1, DPR_MIN), DPR_CAP);

            cssW = canvas.clientWidth || host.clientWidth || 1;
            cssH = canvas.clientHeight || host.clientHeight || 1;
            const wpx = Math.max(1, Math.round(cssW * dpr));
            const hpx = Math.max(1, Math.round(cssH * dpr));
            if (canvas.width !== wpx || canvas.height !== hpx) {
                canvas.width = wpx;
                canvas.height = hpx;
            }
            gl.viewport(0, 0, wpx, hpx);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        let flow = 0;

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (cssW <= 0 || cssH <= 0) {
                resize();
                return;
            }

            const L = live.current;
            const scale = Math.max(L.density, 1) / 100;
            flow += dt * FLOW_AT_50 * (L.speed / 50) * scale;
            flow -= Math.floor(flow);

            const a = dragAngles.current ?? {
                x: (L.yaw * Math.PI) / 180,
                y: (L.pitch * Math.PI) / 180,
            };

            const [br, bgc, bb] = parseColor(L.baseColor);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.uniform2f(u.buf, canvas.width, canvas.height);
            gl.uniform2f(u.res, cssW, cssH);
            gl.uniform2f(u.angles, a.x, a.y);
            gl.uniform1f(u.flow, flow);
            gl.uniform1f(u.scale, scale);
            gl.uniform1f(u.thick, (Math.max(L.thickness, 1) / 100) * CELL_HALF);
            gl.uniform1f(u.dist, Math.max(L.distance, 1));
            gl.uniform1f(u.fog, FOG_AT_100 * (Math.max(L.fog, 1) / 100));
            gl.uniform3f(u.base, br, bgc, bb);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        raf = requestAnimationFrame(frame);

        let dragging = false;
        const aim = (e: PointerEvent) => {
            const r = host.getBoundingClientRect();

            const sx = r.width > 0 ? host.clientWidth / r.width : 1;
            const sy = r.height > 0 ? host.clientHeight / r.height : 1;
            const px = (e.clientX - r.left) * sx;
            const py = (e.clientY - r.top) * sy;
            const h = cssH || 1;
            dragAngles.current = {
                x: (2 * px - (cssW || 1)) / h,
                y: (2 * (h - py) - h) / h,
            };
        };
        const onDown = (e: PointerEvent) => {
            dragging = true;
            aim(e);
            host.style.cursor = "grabbing";
        };
        const onMove = (e: PointerEvent) => {
            if (dragging) aim(e);
        };
        const onUp = () => {
            dragging = false;
            host.style.cursor = "grab";
        };

        host.addEventListener("pointerdown", onDown);

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            host.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, []);

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                cursor: "grab",
                touchAction: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    );
}
