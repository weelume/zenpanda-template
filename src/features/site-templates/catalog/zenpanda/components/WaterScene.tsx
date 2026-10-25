'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { asset } from '../config/brand';
import type { TemplateLocale } from '../../../types';
const vertex = 'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
// 与参考一致：16个指针采样、仅水面位移、环形包络和随年龄衰减；不引入第三方渲染依赖。
const fragment = `precision mediump float;uniform sampler2D uTexture;uniform vec2 uResolution;uniform vec2 uTextureResolution;uniform vec3 uTrail[16];uniform float uHoverState;varying vec2 vUv;
vec2 cover(vec2 uv){float rs=uResolution.x/uResolution.y;float ri=uTextureResolution.x/uTextureResolution.y;if(rs>ri)uv.y=(uv.y-.5)*(ri/rs)+.5;else uv.x=(uv.x-.5)*(rs/ri)+.5;return uv;}
void main(){vec2 aspect=vec2(uResolution.x/uResolution.y,1.);vec2 original=cover(vUv);float mask=1.-smoothstep(.31,.38,original.y);vec2 distortion=vec2(0.);if(mask>.001){for(int i=0;i<16;i++){vec3 pt=uTrail[i];float age=pt.z;if(age>0.&&age<1.){vec2 dir=(vUv-pt.xy)*aspect;float dist=length(dir);if(dist>.0001){float radius=age*.28;float ringDist=abs(dist-radius);float thickness=.052+age*.088;float envelope=1.-smoothstep(0.,thickness,ringDist);float wave=sin((dist-radius)*38.);float fade=(1.-smoothstep(.08,.98,age))*smoothstep(0.,.03,age);distortion+=dir/dist*wave*envelope*fade*.024;}}}}gl_FragColor=texture2D(uTexture,cover(vUv+distortion*uHoverState*mask));}`;
export function WaterScene({ locale }: {
    locale: TemplateLocale;
}) {
    const userChoice = useRef<'play' | 'pause' | null>(null);
    const canvas = useRef<HTMLCanvasElement>(null), video = useRef<HTMLVideoElement>(null);
    const reduced = useReducedMotion();
    const [playing, setPlaying] = useState(false), [error, setError] = useState('');
    useEffect(() => {
        const el = canvas.current, media = video.current;
        if (!el || !media)
            return;
        let frame = 0, disposed = false;
        const gl = el.getContext('webgl', { alpha: false, antialias: true });
        const fail = (stage: string, reason: string) => { console.error('[zenpanda:media]', { stage, reason }); setError(locale === 'zh' ? '动态场景无法播放，请检查设备支持后重试。' : 'The animated scene could not play. Check device support and retry.'); };
        if (!gl) {
            fail('webgl', 'WebGL unavailable');
            return;
        }
        const shader = (type: number, source: string) => { const s = gl.createShader(type); if (!s)
            throw Error('Shader allocation failed'); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(s) || 'Shader compile failed';
            gl.deleteShader(s);
            throw Error(message);
        } return s; };
        let program: WebGLProgram | null = null, vs: WebGLShader | null = null, fs: WebGLShader | null = null;
        try {
            vs = shader(gl.VERTEX_SHADER, vertex);
            fs = shader(gl.FRAGMENT_SHADER, fragment);
            program = gl.createProgram();
            if (!program)
                throw Error('Program allocation failed');
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS))
                throw Error(gl.getProgramInfoLog(program) || 'Link failed');
        }
        catch (e) {
            fail('shader', String(e));
            if (vs)
                gl.deleteShader(vs);
            if (fs)
                gl.deleteShader(fs);
            if (program)
                gl.deleteProgram(program);
            return;
        }
        gl.useProgram(program);
        const buffer = gl.createBuffer(), texture = gl.createTexture();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        const res = gl.getUniformLocation(program, 'uResolution'), texRes = gl.getUniformLocation(program, 'uTextureResolution'), trailLoc = gl.getUniformLocation(program, 'uTrail'), hoverLoc = gl.getUniformLocation(program, 'uHoverState');
        const trail = new Float32Array(48);
        for (let i = 0; i < 16; i++)
            trail[i * 3 + 2] = 1;
        let index = 0, lastX = -100, lastY = -100, target = 0, hover = 0, previous = 0;
        const resize = () => { const rect = el.getBoundingClientRect(), ratio = Math.min(devicePixelRatio, 2); el.width = Math.round(rect.width * ratio); el.height = Math.round(rect.height * ratio); gl.viewport(0, 0, el.width, el.height); gl.uniform2f(res, rect.width, rect.height); };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        resize();
        const sample = (event: PointerEvent) => { if (reduced)
            return; const r = el.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
            target = 0;
            return;
        } const x = (event.clientX - r.left) / r.width, y = 1 - (event.clientY - r.top) / r.height; if (event.type === 'pointerdown' || Math.hypot(x - lastX, y - lastY) > .006) {
            trail.set([x, y, .0001], index * 3);
            index = (index + 1) % 16;
            if (event.type === 'pointerdown') {
                trail.set([x, y, .025], index * 3);
                index = (index + 1) % 16;
                hover = 1;
            }
            lastX = x;
            lastY = y;
        } target = 1; };
        const render = (now: number) => { if (disposed)
            return; const step = previous ? Math.min((now - previous) / (1000 / 60), 4) : 1; previous = now; for (let i = 0; i < 16; i++)
            trail[i * 3 + 2] = Math.min(1, trail[i * 3 + 2] + .007 * step); hover += (target - hover) * (1 - Math.pow(.96, step)); gl.uniform3fv(trailLoc, trail); gl.uniform1f(hoverLoc, reduced ? 0 : hover); if (media.readyState >= 2) {
            gl.uniform2f(texRes, media.videoWidth, media.videoHeight);
            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            catch (e) {
                fail('texture', String(e));
                return;
            }
        } frame = requestAnimationFrame(render); };
        frame = requestAnimationFrame(render);
        window.addEventListener('pointermove', sample, { passive: true });
        window.addEventListener('pointerdown', sample);
        console.debug('[zenpanda:scene]', { stage: 'initialized', samples: 16, reducedMotion: reduced });
        return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('pointermove', sample); window.removeEventListener('pointerdown', sample); gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); if (vs)
            gl.deleteShader(vs); if (fs)
            gl.deleteShader(fs); };
    }, [reduced, locale]);
    useEffect(() => {
        const media = video.current;
        if (!media)
            return;
        let visible = true, intersecting = true;
        const sync = () => { if (document.hidden || !intersecting || userChoice.current === 'pause' || (reduced && userChoice.current !== 'play')) {
            media.pause();
            return;
        } void media.play().catch(e => { if (e.name === 'AbortError')
            return; console.error('[zenpanda:play]', { name: e.name }); setError(locale === 'zh' ? '自动播放被阻止，请点击播放。' : 'Autoplay was blocked. Press play.'); }); };
        const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }, { threshold: 0 });
        observer.observe(media.parentElement!);
        const visibility = () => { visible = !document.hidden; console.debug('[zenpanda:media]', { stage: 'visibility', visible }); sync(); };
        document.addEventListener('visibilitychange', visibility);
        sync();
        return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); media.pause(); };
    }, [reduced, locale]);
    async function toggle() { const media = video.current; if (!media)
        return; if (!media.paused) {
        userChoice.current = 'pause';
        media.pause();
        return;
    } try {
        userChoice.current = 'play';
        await media.play();
        setError('');
    }
    catch (e) {
        console.error('[zenpanda:play]', String(e));
        setError(locale === 'zh' ? '播放失败，请重试。' : 'Playback failed. Please retry.');
    } }
    return <div className="zp-scene"><video ref={video} src={asset('panda-boat.mp4')} muted loop playsInline preload="auto" aria-hidden="true" className="zp-video-source" onPlaying={() => { setPlaying(true); console.debug('[zenpanda:media]', { stage: 'playing' }); }} onPause={() => setPlaying(false)} onError={() => { console.error('[zenpanda:media]', { stage: 'load', code: video.current?.error?.code }); setError(locale === 'zh' ? '视频加载失败，请重试。' : 'Video failed to load. Please retry.'); }}/><canvas ref={canvas} aria-label={locale === 'zh' ? '熊猫泛舟与互动水面' : 'Panda on a boat with interactive water'} role="img"/><button className="zp-media-control" onClick={toggle} aria-label={locale === 'zh' ? (playing ? '暂停背景视频' : '播放背景视频') : (playing ? 'Pause background video' : 'Play background video')}>{playing ? 'Ⅱ' : '▷'}</button>{error && <p className="zp-media-error" role="alert">{error}<button onClick={() => { video.current?.load(); void toggle(); }}>{locale === 'zh' ? '重试' : 'Retry'}</button></p>}</div>;
}
