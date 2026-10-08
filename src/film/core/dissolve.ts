// The 1996 -> 2026 morph. Blends two HDR frames under a scalar k in [0,1]: the old frame softens into a blur and
// crossfades into the new frame, which sharpens as it arrives. (An earlier noise-threshold edge was removed.)
import type * as THREE from 'three';
import { FSPass } from '../engine/gl';

export class Dissolve {
  private pass = new FSPass(/* glsl */ `
    uniform sampler2D a; uniform sampler2D b; uniform float k; uniform float dim;
    vec3 blur(sampler2D s, vec2 uv, float r) {
      if (r < 0.01) return texture(s, uv).rgb;
      vec3 acc = vec3(0.0); float wsum = 0.0;
      vec2 px = r * PX_SCALE / vec2(textureSize(s, 0));
      for (int i = 0; i < 16; i++) {
        float fi = float(i) + 0.5;
        float rr = sqrt(fi / 16.0), th = fi * 2.399963;
        acc += texture(s, uv + px * rr * vec2(cos(th), sin(th))).rgb; wsum += 1.0;
      }
      return acc / wsum;
    }
    void main() {
      float kk = clamp(k, 0.0, 1.0);
      float rA = mix(0.0, 22.0, smoothstep(0.0, 0.85, kk));
      float rB = mix(22.0, 0.0, smoothstep(0.15, 1.0, kk));
      vec3 ca = blur(a, vUv, rA);
      vec3 cb = blur(b, vUv, rB);
      float m = smoothstep(0.32, 0.72, kk);
      vec3 col = mix(ca, cb, m);
      fragColor = vec4(col * dim, 1.0);
    }`, { a: { value: null }, b: { value: null }, k: { value: 0 }, dim: { value: 1 } });

  render(renderer: THREE.WebGLRenderer, a: THREE.Texture, b: THREE.Texture, out: THREE.WebGLRenderTarget, k: number, dim = 1) {
    this.pass.u.a!.value = a;
    this.pass.u.b!.value = b;
    this.pass.u.k!.value = k;
    this.pass.u.dim!.value = dim;
    this.pass.render(renderer, out);
  }
}
