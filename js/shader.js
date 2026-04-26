/* 1win.moscow — Hero WebGL Plasma Shader (vanilla, no deps) */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('hero-shader');
  if (!canvas) return;

  var hero = canvas.parentElement;
  if (!hero) return;

  var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: true });
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  var vsSource =
    'attribute vec4 aVertexPosition;void main(){gl_Position=aVertexPosition;}';

  var fsSource = [
    'precision highp float;',
    'uniform vec2 iResolution;',
    'uniform float iTime;',
    'const float overallSpeed=0.2;',
    'const float gridSmoothWidth=0.015;',
    'const float lineSpeed=0.2;',
    'const float lineAmplitude=1.0;',
    'const float lineFrequency=0.2;',
    'const float warpSpeed=0.04;',
    'const float warpFrequency=0.5;',
    'const float warpAmplitude=1.0;',
    'const float offsetFrequency=0.5;',
    'const float offsetSpeed=0.266;',
    'const float minOffsetSpread=0.6;',
    'const float maxOffsetSpread=2.0;',
    'const float minLineWidth=0.01;',
    'const float maxLineWidth=0.2;',
    'const float scale=5.0;',
    'const int linesPerGroup=16;',
    'const vec4 lineColor=vec4(0.55,0.36,0.96,1.0);',
    '#define drawCircle(pos,radius,coord) smoothstep(radius+gridSmoothWidth,radius,length(coord-(pos)))',
    '#define drawSmoothLine(pos,halfWidth,t) smoothstep(halfWidth,0.0,abs(pos-(t)))',
    '#define drawCrispLine(pos,halfWidth,t) smoothstep(halfWidth+gridSmoothWidth,halfWidth,abs(pos-(t)))',
    'float random(float t){return (cos(t)+cos(t*1.3+1.3)+cos(t*1.4+1.4))/3.0;}',
    'float getPlasmaY(float x,float horizontalFade,float offset){',
    '  return random(x*lineFrequency+iTime*lineSpeed)*horizontalFade*lineAmplitude+offset;',
    '}',
    'void main(){',
    '  vec2 fragCoord=gl_FragCoord.xy;',
    '  vec2 uv=fragCoord.xy/iResolution.xy;',
    '  vec2 space=(fragCoord-iResolution.xy/2.0)/iResolution.x*2.0*scale;',
    '  float horizontalFade=1.0-(cos(uv.x*6.28)*0.5+0.5);',
    '  float verticalFade=1.0-(cos(uv.y*6.28)*0.5+0.5);',
    '  space.y+=random(space.x*warpFrequency+iTime*warpSpeed)*warpAmplitude*(0.5+horizontalFade);',
    '  space.x+=random(space.y*warpFrequency+iTime*warpSpeed+2.0)*warpAmplitude*horizontalFade;',
    '  vec4 lines=vec4(0.0);',
    '  vec4 bgColor1=vec4(0.04,0.03,0.15,1.0);',
    '  vec4 bgColor2=vec4(0.18,0.06,0.32,1.0);',
    '  for(int l=0;l<linesPerGroup;l++){',
    '    float normalizedLineIndex=float(l)/float(linesPerGroup);',
    '    float offsetTime=iTime*offsetSpeed;',
    '    float offsetPosition=float(l)+space.x*offsetFrequency;',
    '    float rand=random(offsetPosition+offsetTime)*0.5+0.5;',
    '    float halfWidth=mix(minLineWidth,maxLineWidth,rand*horizontalFade)/2.0;',
    '    float offset=random(offsetPosition+offsetTime*(1.0+normalizedLineIndex))*mix(minOffsetSpread,maxOffsetSpread,horizontalFade);',
    '    float linePosition=getPlasmaY(space.x,horizontalFade,offset);',
    '    float line=drawSmoothLine(linePosition,halfWidth,space.y)/2.0+drawCrispLine(linePosition,halfWidth*0.15,space.y);',
    '    float circleX=mod(float(l)+iTime*lineSpeed,25.0)-12.0;',
    '    vec2 circlePosition=vec2(circleX,getPlasmaY(circleX,horizontalFade,offset));',
    '    float circle=drawCircle(circlePosition,0.01,space)*4.0;',
    '    line=line+circle;',
    '    lines+=line*lineColor*rand;',
    '  }',
    '  vec4 fragColor=mix(bgColor1,bgColor2,uv.x);',
    '  fragColor*=verticalFade;',
    '  fragColor.a=1.0;',
    '  fragColor+=lines;',
    '  gl_FragColor=fragColor;',
    '}'
  ].join('\n');

  function compile(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = compile(vsSource, gl.VERTEX_SHADER);
  var fs = compile(fsSource, gl.FRAGMENT_SHADER);
  if (!vs || !fs) {
    canvas.style.display = 'none';
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.style.display = 'none';
    return;
  }

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var aPos = gl.getAttribLocation(prog, 'aVertexPosition');
  var uRes = gl.getUniformLocation(prog, 'iResolution');
  var uTime = gl.getUniformLocation(prog, 'iTime');

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    var rect = hero.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width * dpr));
    var h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  var visible = true;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(hero);
  }

  var startTime = performance.now();
  function frame() {
    if (visible) {
      var t = (performance.now() - startTime) / 1000;
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aPos);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(frame);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(function () { requestAnimationFrame(frame); });
  } else {
    requestAnimationFrame(frame);
  }
})();
