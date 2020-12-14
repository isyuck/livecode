#version 150

precision highp float;

#define MAX_STEPS 100
#define MAX_DIST  100.0
#define SURF_DIST 0.001

#define PI 3.14159265359
#define PI2 6.28318530718

uniform float time;
uniform vec2 resolution;

uniform int mode;
uniform float seed;

const float Epsilon = 1e-10;

vec4 frag_new = gl_FragCoord * 1.0;

const vec3 palette[22] = vec3[](vec3(0.00, 0.7, 1.0),
                                vec3(0.05, 0.7, 1.0),
                                vec3(0.10, 0.7, 1.0),
                                vec3(0.15, 0.7, 1.0),
                                vec3(0.20, 0.7, 1.0),
                                vec3(0.25, 0.7, 1.0),
                                vec3(0.30, 0.7, 1.0),
                                vec3(0.35, 0.7, 1.0),
                                vec3(0.40, 0.7, 1.0),
                                vec3(0.45, 0.7, 1.0),
                                vec3(0.50, 0.7, 1.0),
                                vec3(0.55, 0.7, 1.0),
                                vec3(0.60, 0.7, 1.0),
                                vec3(0.65, 0.7, 1.0),
                                vec3(0.70, 0.7, 1.0),
                                vec3(0.75, 0.7, 1.0),
                                vec3(0.80, 0.7, 1.0),
                                vec3(0.85, 0.7, 1.0),
                                vec3(0.90, 0.7, 1.0),
                                vec3(0.95, 0.7, 1.0),
                                vec3(0.00, 0.0, 1.0),
                                vec3(0.00, 0.0, 0.0));
const int paletteSize = 22;

const int indexMatrix8x8[64] = int[](0,  32, 8,  40, 2,  34, 10, 42,
                                     48, 16, 56, 24, 50, 18, 58, 26,

                                     12, 44, 4,  36, 14, 46, 6,  38,
                                     60, 28, 52, 20, 62, 30, 54, 22,
                                     3,  35, 11, 43, 1,  33, 9,  41,
                                     51, 19, 59, 27, 49, 17, 57, 25,
                                     15, 47, 7,  39, 13, 45, 5,  37,
                                     63, 31, 55, 23, 61, 29, 53, 21);


vec3 HUEtoRGB(float H) {
    float R = abs(H * 6.0 - 3.0) - 1.0;
    float G = 2.0 - abs(H * 6.0 - 2.0);
    float B = 2.0 - abs(H * 6.0 - 4.0);
    return clamp(vec3(R,G,B), 0.0, 1.0);
}

vec3 HSLtoRGB(vec3 HSL) {
    vec3 RGB = HUEtoRGB(HSL.x);
    float C = (1.0 - abs(2 * HSL.z - 1.0)) * HSL.y;
    return (RGB - 0.5) * C + HSL.z;
}

vec3 RGBtoHCV(vec3 RGB) {
    // based on work by sam hocevar and emil persson
    vec4 P = (RGB.g < RGB.b) ? vec4(RGB.bg, -1.0, 2.0/3.0) : vec4(RGB.gb, 0.0, -1.0/3.0);
    vec4 Q = (RGB.r < P.x) ? vec4(P.xyw, RGB.r) : vec4(RGB.r, P.yzx);
    float C = Q.x - min(Q.w, Q.y);
    float H = abs((Q.w - Q.y) / (6.0 * C + Epsilon) + Q.z);
    return vec3(H, C, Q.x);
}

vec3 RGBtoHSV(in vec3 RGB) {
    vec3 HCV = RGBtoHCV(RGB);
    float S = HCV.y / (HCV.z + Epsilon);
    return vec3(HCV.x, S, HCV.z);
}

vec3 RGBtoHSL(in vec3 RGB) {
    vec3 HCV = RGBtoHCV(RGB);
    float L = HCV.z - HCV.y * 0.5;
    float S = HCV.y / (1.0 - abs(L * 2.0 - 1.0) + Epsilon);
    return vec3(HCV.x, S, L);
}

float indexValue() {
    int x = int(mod(frag_new.x, 8));
    int y = int(mod(frag_new.y, 8));
    return indexMatrix8x8[(x + y * 8)] / 64.0;
}

float hueDistance(float h1, float h2) {
    float diff = abs((h1 - h2));
    return min(abs((1.0 - diff)), diff);
}

vec3[2] closestColors(float hue) {
    vec3 ret[2];
    vec3 closest = vec3(-2.0, 0.0, 0.0);
    vec3 secondClosest = vec3(-2.0, 0.0, 0.0);
    vec3 temp;
    for (int i = 0; i < paletteSize; ++i) {
        temp = palette[i];
        float tempDistance = hueDistance(temp.x, hue);
        if (tempDistance < hueDistance(closest.x, hue)) {
            secondClosest = closest;
            closest = temp;
        } else {
            if (tempDistance < hueDistance(secondClosest.x, hue)) {
                secondClosest = temp;
            }
        }
    }
    ret[0] = closest;
    ret[1] = secondClosest;
    return ret;
}

const float lightnessSteps = 4.0;

float lightnessStep(float l) {
    /* Quantize the lightness to one of `lightnessSteps` values */
    return floor((0.5 + l * lightnessSteps)) / lightnessSteps;
}

vec3 dither(vec3 color) {
    vec3 hsl = RGBtoHSL(color);

    vec3 cs[2] = closestColors(hsl.x);
    vec3 c1 = cs[0];
    vec3 c2 = cs[1];
    float d = indexValue();
    float hueDiff = hueDistance(hsl.x, c1.x) / hueDistance(c2.x, c1.x);

    float l1 = lightnessStep(max((hsl.z - 0.125), 0.0));
    float l2 = lightnessStep(min((hsl.z + 0.124), 1.0));
    float lightnessDiff = (hsl.z - l1) / (l2 - l1);

    vec3 resultColor = (hueDiff < d) ? c1 : c2;
    resultColor.z = (lightnessDiff < d) ? l1 : l2;
    return HSLtoRGB(resultColor);
}

// rotate around the excluded axis. to rotate p by
// amount a around y axis: p.xz *= rotate(a);
mat2 rotate(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float smin( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float smax( float a, float b, float k )
{
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}
float sd_gyroid (vec3 p, float scale, float thick, float bias) {
    p *= scale;
    return abs(dot(sin(p), cos(p.zxy)) - bias) / scale - thick;
}

float sd_box(vec3 p, vec3 s) {
    p = abs(p)-s;
    return length(max(p, 0.0))+min(max(p.x, max(p.y, p.z)), 0.0);
}

float get_dist(vec3 p) {



    p.xz *= rotate(time*0.08 + seed);
    p.zy *= rotate(time*0.1 + seed);

    float bounding_box = sd_box(p, vec3(1.5));

    p += vec3(time * 0.1, time * 0.4, time * 0.35);

    float gyroid_1 = sd_gyroid(p, 2.0, 0.05, 0.01);
    float gyroid_2 = sd_gyroid(p, 4.0, 0.05, 0.01);

    gyroid_1 -= gyroid_2;

    float g3 = smin(gyroid_1, gyroid_2, 0.3);

    float d = smax(bounding_box, g3, 0.1);

    return d;
}

float raymarch(vec3 ro, vec3 rd) {
    float dO=0.;

    vec3 col = vec3(0.7, 0.9, 1.0);

    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd*dO;
        float dS = get_dist(p);
        dO += dS;
        if(dO>MAX_DIST || abs(dS)<SURF_DIST) break;
    }

    return dO;
}

vec3 get_normal(vec3 p) {
    float d = get_dist(p);
    vec2 e = vec2(0.001, 0.0);

    vec3 n = d - vec3(
        get_dist(p-e.xyy),
        get_dist(p-e.yxy),
        get_dist(p-e.yyx));

    return normalize(n);
}

vec3 get_ray_dir(vec2 uv, vec3 p, vec3 l, float z) {
    vec3 f = normalize(l-p),
        r = normalize(cross(vec3(0.0,1.0,0.0), f)),
        u = cross(f,r),
        c = f*z,
        i = c + uv.x*r + uv.y*u,
        d = normalize(i);
    return d;
}

void main() {
    vec2 uv = (frag_new.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 col = vec3(0.0);

    vec3 ro = vec3(0.0, 0.0, seed*6.0);
    vec3 rd = get_ray_dir(uv, ro, vec3(0.0), 1.0);

    float d = raymarch(ro, rd);

    if(d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = get_normal(p);

        float dif = dot(n, normalize(vec3(1.0, 2.0, 3.0))) * 0.5 + 0.5;
        // col += n * 0.5 + 0.5;
        col = vec3(dif);
    }


    float contrast = 0.8;
    float brightness = 0.0;
    col = (col - 0.5) * contrast + 0.5 + brightness;

    // col = vec3(0.0);
    // col.gb = vec2(uv.x + 0.7, uv.y + 0.9) * 0.7;

    gl_FragColor = vec4(dither(col), 1.0);

}
