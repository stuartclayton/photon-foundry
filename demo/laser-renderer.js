var LaserRendererModule=(()=>{var te=Object.defineProperty;var Be=Object.getOwnPropertyDescriptor;var Me=Object.getOwnPropertyNames;var Ie=Object.prototype.hasOwnProperty;var Se=(c,e)=>{for(var t in e)te(c,t,{get:e[t],enumerable:!0})},Xe=(c,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Me(e))!Ie.call(c,r)&&r!==t&&te(c,r,{get:()=>e[r],enumerable:!(s=Be(e,r))||s.enumerable});return c};var Ge=c=>Xe(te({},"__esModule",{value:!0}),c);var je={};Se(je,{LaserRenderer:()=>M,initializeLaserBackground:()=>re});var g=window.twgl.m4,d=window.twgl.v3;var $=class c{width;height;depth;data;constructor(e,t,s){this.width=e,this.height=t,this.depth=s,this.data=new Float32Array(e*t*s)}static fromData(e){let t=new DataView(e.buffer,e.byteOffset,e.byteLength),s=t.getUint32(0,!1),r=t.getUint32(4,!1),o=t.getUint32(8,!1),l=new c(s,r,o),n=e.slice(12);for(let a=0;a<n.length;a++)l.data[a]=n[a]/255;return l}},Ve=`#version 300 es
  precision highp float;

  in vec4 a_position;
  in vec3 a_texcoord;
  in vec3 a_normal;
  in vec4 a_diffuse;
  in float a_beamType;

  uniform mat4 u_world;
  uniform mat4 u_worldViewProjection;
  uniform mat4 u_worldViewProjectionInverse;
  uniform mat4 u_worldInverseTranspose;

  uniform vec3 u_cameraPosition;
  uniform vec3 u_laserPosition;

  out vec4 v_diffuse;
  out vec3 v_normal;
  out vec3 v_texcoord;
  out float v_beamType;

  out vec3 v_cameraDir;
  out vec3 v_viewDir;
  out vec3 v_laserDir;
  out float v_lightDist;

  void main() {
    vec4 ecPos = u_worldViewProjection * a_position;
    vec4 worldLaser = u_worldViewProjection * vec4(u_laserPosition, 1.0);
    vec3 cameraPosition = vec3(u_worldViewProjection * vec4(u_cameraPosition, 1.0));

    v_cameraDir = normalize(u_cameraPosition - worldLaser.xyz);
    vec4 worldPos = u_world * a_position;
    v_viewDir = normalize(u_cameraPosition - worldPos.xyz);
    v_laserDir = vec3(ecPos.xyz - worldLaser.xyz);
    v_lightDist = length(v_laserDir);

    v_diffuse = a_diffuse;
    v_normal = mat3(u_worldInverseTranspose) * a_normal;
    v_texcoord = a_texcoord;
    v_beamType = a_beamType;

    gl_Position = ecPos;
  }
`,Ne=`#version 300 es
  precision highp float;

  uniform highp sampler3D tex;
  uniform float u_timer;

  in vec4 v_diffuse;
  in vec3 v_normal;
  in vec3 v_texcoord;
  in float v_beamType;
  in vec3 v_cameraDir;
  in vec3 v_viewDir;
  in vec3 v_laserDir;
  in float v_lightDist;

  out vec4 fragColor;

  // Debug mode: 0 = normal render, 1 = show normals as RGB, 2 = show view direction, 3 = show NdotL
  const int DEBUG_MODE = 0;
  const float SAMPLE_DISTANCE = 0.02;

  void main() {
    vec3 n = normalize(v_normal);
    vec3 viewDir = normalize(v_viewDir);
    float NdotL = abs(dot(n, viewDir));

    // DEBUG: Visualize normals/vectors as colors
    if (DEBUG_MODE == 1) {
      // Show normals as RGB: maps [-1,1] to [0,1]
      fragColor = vec4(abs(n), 1.0);
      return;
    } else if (DEBUG_MODE == 2) {
      // Show view direction as RGB
      fragColor = vec4(abs(viewDir), 1.0);
      return;
    } else if (DEBUG_MODE == 3) {
      // Show NdotL as grayscale (white = facing camera, black = perpendicular)
      fragColor = vec4(vec3(1.0-NdotL), 1.0);
      return;
    }

    float s = v_texcoord.s + (u_timer/4.0);// - (sin(v_texcoord.t * 2.0 + u_timer));
    float t = v_texcoord.t;// - (u_timer / 5.0);
    float p = v_texcoord.p - (u_timer/4.0);// + (cos(v_texcoord.p * 2.0 - u_timer) / 8.0);

    vec4 texel = texture(tex, vec3(s, t, p));
    vec4 texel1 = texture(tex, vec3(s, t, p+SAMPLE_DISTANCE));
    vec4 texel2 = texture(tex, vec3(s, t, p-SAMPLE_DISTANCE));
    vec4 texel3 = texture(tex, vec3(s, t+SAMPLE_DISTANCE, p));
    vec4 texel4 = texture(tex, vec3(s, t-SAMPLE_DISTANCE, p));
    vec4 texel5 = texture(tex, vec3(s+SAMPLE_DISTANCE, t, p));
    vec4 texel6 = texture(tex, vec3(s-SAMPLE_DISTANCE, t, p));

    //float smokeValue = texel.r; // Using R16F format for high precision

    float smokeValue = texel.r*0.166 + texel1.r*0.166 + texel2.r*0.166 + texel3.r*0.166 + texel4.r*0.166 + texel5.r*0.166 + texel6.r*0.166;

    vec4 texelHighlight = texture(tex, vec3(s/2.0, t/2.0, p/2.0 + 0.1));

    float smokeHighlight = clamp(0.5 + 5.0 * (texelHighlight.r - 0.5), 0.0, 1.0);


    //smokeValue = clamp(smokeValue + (smokeHighlight * smokeHighlight * smokeHighlight * 2.0), 0.0, 1.0);
    float fresnel = 1.0 - NdotL;
    float radius = 4.4;

    float falloff = clamp(1.0 - v_lightDist*v_lightDist/(radius*radius), 0.0, 1.0);
    falloff *= falloff;

    fresnel = fresnel * fresnel * fresnel * 2.0;

    // Beam hold vertices: brighter with less falloff
    float beamBoost = mix(1.0, 3.0, v_beamType);  // 3x brighter for beams
    float adjustedFalloff = mix(falloff, sqrt(falloff), v_beamType);  // Less aggressive falloff for beams

    float power = (smokeValue * 1.2 + (smokeHighlight) + fresnel) * adjustedFalloff * beamBoost;

    // Dithering to eliminate 8-bit alpha banding artifacts
    // Screen-space noise pattern that varies per pixel
    float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float dither = (noise - 0.5) / 255.0;  // \xB10.5 LSB dither range

    // Apply spherical falloff for beam quads (hemisphere cross-section)
    float baseAlpha = v_diffuse.a;
    // Spherical curve: sqrt(alpha * (2 - alpha)) creates a hemisphere profile
    float sphericalAlpha = sqrt(baseAlpha * (2.0 - baseAlpha));
    float roundedAlpha = mix(baseAlpha, sphericalAlpha, v_beamType);

    fragColor = vec4(v_diffuse.rgb, (power + dither) * roundedAlpha);
  }
`,Q=`#version 300 es
  precision highp float;

  in vec2 a_position;
  out vec2 v_texCoord;

  void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`,Oe=`#version 300 es
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_offset;

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec2 halfPixel = texelSize * u_offset;

    // 4-sample pattern (diamond)
    vec4 sum = texture(u_texture, v_texCoord + vec2(-halfPixel.x, 0.0));
    sum += texture(u_texture, v_texCoord + vec2(halfPixel.x, 0.0));
    sum += texture(u_texture, v_texCoord + vec2(0.0, -halfPixel.y));
    sum += texture(u_texture, v_texCoord + vec2(0.0, halfPixel.y));

    fragColor = sum * 0.25;
  }
`,We=`#version 300 es
  precision highp float;

  uniform sampler2D u_scene;
  uniform sampler2D u_bloom;
  uniform float u_bloomIntensity;

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    vec4 sceneColor = texture(u_scene, v_texCoord);
    vec4 bloomColor = texture(u_bloom, v_texCoord);

    // Additive blend with intensity control, clamped to prevent blow-out
    fragColor = clamp(sceneColor + bloomColor * u_bloomIntensity, 0.0, 1.0);
  }
`,Ye=`#version 300 es
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_threshold;

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    vec2 texelSize = 1.0 / u_resolution;

    // 2x2 box filter
    vec4 sum = texture(u_texture, v_texCoord + vec2(-0.5, -0.5) * texelSize);
    sum += texture(u_texture, v_texCoord + vec2(0.5, -0.5) * texelSize);
    sum += texture(u_texture, v_texCoord + vec2(-0.5, 0.5) * texelSize);
    sum += texture(u_texture, v_texCoord + vec2(0.5, 0.5) * texelSize);

    vec4 avg = sum * 0.25;

    // Extract only bright areas above threshold
    // Standard bloom threshold: subtract threshold and clamp to zero
    fragColor = max(vec4(0.0), avg - u_threshold);
  }
`,ke=`#version 300 es
  precision highp float;

  uniform sampler2D u_current;
  uniform sampler2D u_previous;
  uniform float u_decay;

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    vec4 current = texture(u_current, v_texCoord);
    vec4 previous = texture(u_previous, v_texCoord);

    // Blend current with decayed previous
    fragColor = current + previous * u_decay;
  }
`,x=[0,0,-4],_e=60*(Math.PI/180),ze=60*(Math.PI/180),He=[0,0,0],qe=8e-4*window.devicePixelRatio,M=class c{canvas;gl=null;shaderProgram=null;smokeTexture=null;animationFrameId=null;hasFloatLinearFiltering=!1;smokeOffset=0;shouldUpdateGeometry=!1;framePoints=[];beamsPoints=[];verts=[];texCoords=[];colours=[];norms=[];beamTypes=[];vertCount=0;positionLoc=-1;diffuseLoc=-1;normalLoc=-1;texCoordLoc=-1;beamTypeLoc=-1;shaderTimeLoc=null;worldMatrixLoc=null;worldViewProjectionLoc=null;worldViewProjectionInverseLoc=null;worldInverseTransposeLoc=null;cameraPositionLoc=null;vao=null;rotationX=g.identity();rotationY=g.identity();laserDirection=[0,0,-4];fps=60;lastFrameTime=performance.now();beamIntensity=.1;bloomEnabled=!0;bloomIntensity=.5;bloomThreshold=.5;persistenceEnabled=!0;decayRate=.8;blurPasses=2;mainFramebuffer=null;mainTexture=null;bloomFramebufferA=null;bloomTextureA=null;bloomFramebufferB=null;bloomTextureB=null;tempFramebuffer=null;tempTexture=null;currentBloomBuffer=0;downsampleProgram=null;blurProgram=null;compositeProgram=null;blendDecayProgram=null;quadVAO=null;constructor(e){this.canvas=e}initialize(e){if(this.gl=this.canvas.getContext("webgl2"),!this.gl)throw new Error("WebGL2 is not supported");this.hasFloatLinearFiltering=!0,this.shaderProgram=c.createProgram(this.gl,Ve,Ne),this.lookupLocations();let t=e instanceof $?e:$.fromData(e);this.smokeTexture=c.create3DTexture(this.gl,t),c.initTexture(this.gl,this.smokeTexture,this.hasFloatLinearFiltering),this.downsampleProgram=c.createProgram(this.gl,Q,Ye),this.blurProgram=c.createProgram(this.gl,Q,Oe),this.compositeProgram=c.createProgram(this.gl,Q,We),this.blendDecayProgram=c.createProgram(this.gl,Q,ke),this.createFramebuffers(),this.createQuadVAO(),this.shouldUpdateGeometry=!0,this.lastFrameTime=performance.now(),this.animationFrameId=requestAnimationFrame(()=>this.drawFrame())}setBeamIntensity(e){this.beamIntensity=e}setBloomEnabled(e){this.bloomEnabled=e}setBloomIntensity(e){this.bloomIntensity=Math.max(0,Math.min(2,e))}setBlurPasses(e){this.blurPasses=Math.max(1,Math.min(5,e))}resize(){if(!this.gl){console.warn("Cannot resize LaserRenderer: WebGL2 context not initialized");return}let{clientWidth:e,clientHeight:t}=this.canvas;if(!e||!t){console.warn("Cannot resize LaserRenderer: canvas has zero width or height",e+"x"+t,this.canvas);return}let s=Math.floor(e*window.devicePixelRatio),r=Math.floor(t*window.devicePixelRatio);this.canvas.width=s,this.canvas.height=r,this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.createFramebuffers()}updatePoints(e){this.framePoints=e.points.slice(),this.beamsPoints=e.beams.slice(),this.shouldUpdateGeometry=!0}dispose(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null),this.framePoints=[],this.shouldUpdateGeometry=!1,this.gl&&(this.mainTexture&&this.gl.deleteTexture(this.mainTexture),this.mainFramebuffer&&this.gl.deleteFramebuffer(this.mainFramebuffer),this.bloomTextureA&&this.gl.deleteTexture(this.bloomTextureA),this.bloomFramebufferA&&this.gl.deleteFramebuffer(this.bloomFramebufferA),this.bloomTextureB&&this.gl.deleteTexture(this.bloomTextureB),this.bloomFramebufferB&&this.gl.deleteFramebuffer(this.bloomFramebufferB),this.tempTexture&&this.gl.deleteTexture(this.tempTexture),this.tempFramebuffer&&this.gl.deleteFramebuffer(this.tempFramebuffer),this.quadVAO&&this.gl.deleteVertexArray(this.quadVAO))}lookupLocations(){!this.gl||!this.shaderProgram||(this.positionLoc=this.gl.getAttribLocation(this.shaderProgram,"a_position"),this.diffuseLoc=this.gl.getAttribLocation(this.shaderProgram,"a_diffuse"),this.normalLoc=this.gl.getAttribLocation(this.shaderProgram,"a_normal"),this.texCoordLoc=this.gl.getAttribLocation(this.shaderProgram,"a_texcoord"),this.beamTypeLoc=this.gl.getAttribLocation(this.shaderProgram,"a_beamType"),this.shaderTimeLoc=this.gl.getUniformLocation(this.shaderProgram,"u_timer"),this.worldMatrixLoc=this.gl.getUniformLocation(this.shaderProgram,"u_world"),this.worldViewProjectionLoc=this.gl.getUniformLocation(this.shaderProgram,"u_worldViewProjection"),this.worldViewProjectionInverseLoc=this.gl.getUniformLocation(this.shaderProgram,"u_worldViewProjectionInverse"),this.worldInverseTransposeLoc=this.gl.getUniformLocation(this.shaderProgram,"u_worldInverseTranspose"),this.cameraPositionLoc=this.gl.getUniformLocation(this.shaderProgram,"u_cameraPosition"))}drawFrame(){if(!this.gl)return;let e=performance.now(),t=1e3/this.fps,s=e-this.lastFrameTime;if(s<t){this.animationFrameId=requestAnimationFrame(()=>this.drawFrame());return}this.lastFrameTime=e-s%t,this.smokeOffset+=.05/Math.max(s,1),this.shouldUpdateGeometry&&(this.generateBeams(this.framePoints,this.beamsPoints),this.shouldUpdateGeometry=!1),this.bloomEnabled&&this.mainFramebuffer&&this.bloomFramebufferA?this.renderWithBloom():this.renderDirect(),this.animationFrameId=requestAnimationFrame(()=>this.drawFrame())}renderDirect(){this.gl&&(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT),this.gl.disable(this.gl.DEPTH_TEST),this.gl.disable(this.gl.CULL_FACE),this.vertCount>0&&this.shaderProgram&&(this.enableLaserFragmentProgram(this.smokeOffset),this.gl.drawArrays(this.gl.TRIANGLES,0,this.vertCount/3)),this.disableFragmentProgram())}renderWithBloom(){if(!this.gl||!this.mainFramebuffer||!this.bloomFramebufferA||!this.tempFramebuffer)return;this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.mainFramebuffer),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT),this.gl.disable(this.gl.DEPTH_TEST),this.gl.disable(this.gl.CULL_FACE),this.gl.enable(this.gl.BLEND),this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE),this.vertCount>0&&this.shaderProgram&&(this.enableLaserFragmentProgram(this.smokeOffset),this.gl.drawArrays(this.gl.TRIANGLES,0,this.vertCount/3)),this.disableFragmentProgram();let e=Math.floor(this.canvas.width/4),t=Math.floor(this.canvas.height/4);this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferA),this.gl.viewport(0,0,e,t),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.renderQuad(this.downsampleProgram,this.mainTexture,{u_resolution:[this.canvas.width,this.canvas.height],u_threshold:this.bloomThreshold}),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.tempFramebuffer),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT);for(let s=0;s<this.blurPasses;s++){let r=s+1;this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.tempFramebuffer),this.renderQuad(this.blurProgram,this.bloomTextureA,{u_resolution:[e,t],u_offset:r}),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferA),this.renderQuad(this.blurProgram,this.tempTexture,{u_resolution:[e,t],u_offset:r})}this.persistenceEnabled&&this.bloomFramebufferB&&this.blendDecayProgram&&(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.tempFramebuffer),this.gl.viewport(0,0,e,t),this.renderQuadTwoTextures(this.blendDecayProgram,this.bloomTextureA,this.bloomTextureB,{u_decay:this.decayRate}),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferA),this.renderQuad(this.blurProgram,this.tempTexture,{u_resolution:[e,t],u_offset:0}),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferB),this.renderQuad(this.blurProgram,this.tempTexture,{u_resolution:[e,t],u_offset:0})),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.renderQuad(this.compositeProgram,this.mainTexture,{u_bloomIntensity:this.bloomIntensity},this.bloomTextureA)}renderQuad(e,t,s={},r=null){if(!this.gl||!e||!t||!this.quadVAO)return;this.gl.disable(this.gl.BLEND),this.gl.useProgram(e),this.gl.bindVertexArray(this.quadVAO),this.gl.activeTexture(this.gl.TEXTURE0),this.gl.bindTexture(this.gl.TEXTURE_2D,t);let o=this.gl.getUniformLocation(e,"u_texture");if(o)this.gl.uniform1i(o,0);else{let l=this.gl.getUniformLocation(e,"u_scene");l&&this.gl.uniform1i(l,0)}if(r){this.gl.activeTexture(this.gl.TEXTURE1),this.gl.bindTexture(this.gl.TEXTURE_2D,r);let l=this.gl.getUniformLocation(e,"u_bloom");l&&this.gl.uniform1i(l,1)}Object.entries(s).forEach(([l,n])=>{let a=this.gl.getUniformLocation(e,l);a&&(Array.isArray(n)?n.length===2?this.gl.uniform2f(a,n[0],n[1]):n.length===3&&this.gl.uniform3f(a,n[0],n[1],n[2]):this.gl.uniform1f(a,n))}),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.gl.bindVertexArray(null)}renderQuadTwoTextures(e,t,s,r={}){if(!this.gl||!e||!t||!s||!this.quadVAO)return;this.gl.disable(this.gl.BLEND),this.gl.useProgram(e),this.gl.bindVertexArray(this.quadVAO),this.gl.activeTexture(this.gl.TEXTURE0),this.gl.bindTexture(this.gl.TEXTURE_2D,t);let o=this.gl.getUniformLocation(e,"u_current");o&&this.gl.uniform1i(o,0),this.gl.activeTexture(this.gl.TEXTURE1),this.gl.bindTexture(this.gl.TEXTURE_2D,s);let l=this.gl.getUniformLocation(e,"u_previous");l&&this.gl.uniform1i(l,1),Object.entries(r).forEach(([n,a])=>{let m=this.gl.getUniformLocation(e,n);m&&(Array.isArray(a)?a.length===2?this.gl.uniform2f(m,a[0],a[1]):a.length===3&&this.gl.uniform3f(m,a[0],a[1],a[2]):this.gl.uniform1f(m,a))}),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.gl.bindVertexArray(null)}enableLaserFragmentProgram(e){if(!this.gl||!this.shaderProgram||this.positionLoc===-1)return;this.gl.useProgram(this.shaderProgram);let t=this.gl.getUniformLocation(this.shaderProgram,"u_laserPosition");if(t&&this.gl.uniform3f(t,x[0],x[1],x[2]),this.shaderTimeLoc&&this.gl.uniform1f(this.shaderTimeLoc,e),this.updateMatrices(),this.vao){this.gl.bindVertexArray(this.vao);return}let s=this.gl.createVertexArray();if(!s)return;this.vao=s,this.gl.bindVertexArray(s);let r=this.gl.createBuffer(),o=this.gl.createBuffer(),l=this.gl.createBuffer(),n=this.gl.createBuffer();if(!(!r||!o||!l||!n)){if(this.gl.bindBuffer(this.gl.ARRAY_BUFFER,r),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(this.verts),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(this.positionLoc),this.gl.vertexAttribPointer(this.positionLoc,3,this.gl.FLOAT,!1,0,0),this.normalLoc!==-1&&(this.gl.bindBuffer(this.gl.ARRAY_BUFFER,o),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(this.norms),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(this.normalLoc),this.gl.vertexAttribPointer(this.normalLoc,3,this.gl.FLOAT,!1,0,0)),this.texCoordLoc!==-1&&(this.gl.bindBuffer(this.gl.ARRAY_BUFFER,l),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(this.texCoords),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(this.texCoordLoc),this.gl.vertexAttribPointer(this.texCoordLoc,3,this.gl.FLOAT,!0,0,0)),this.diffuseLoc!==-1&&(this.gl.bindBuffer(this.gl.ARRAY_BUFFER,n),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Uint8Array(this.colours),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(this.diffuseLoc),this.gl.vertexAttribPointer(this.diffuseLoc,4,this.gl.UNSIGNED_BYTE,!0,0,0)),this.beamTypeLoc!==-1){let a=this.gl.createBuffer();a&&(this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(this.beamTypes),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(this.beamTypeLoc),this.gl.vertexAttribPointer(this.beamTypeLoc,1,this.gl.FLOAT,!1,0,0))}this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null)}}updateMatrices(){if(!this.gl||!this.shaderProgram)return;let e=this.canvas.clientWidth/this.canvas.clientHeight,t=g.perspective(ze,e,.001,4),s=g.lookAt([0,0,0],x,[-1,0,0]),r=g.inverse(s),o=g.multiply(t,r),l=g.identity();l=g.rotateZ(l,-90*(Math.PI/2)),l=g.scale(l,d.create(-1,1,1));let n=g.multiply(o,l),a=g.inverse(l),m=g.transpose(a),L=g.inverse(n);this.worldMatrixLoc&&this.gl.uniformMatrix4fv(this.worldMatrixLoc,!1,l),this.worldViewProjectionLoc&&this.gl.uniformMatrix4fv(this.worldViewProjectionLoc,!1,n),this.worldInverseTransposeLoc&&this.gl.uniformMatrix4fv(this.worldInverseTransposeLoc,!1,m),this.worldViewProjectionInverseLoc&&this.gl.uniformMatrix4fv(this.worldViewProjectionInverseLoc,!1,L),this.cameraPositionLoc&&this.gl.uniform3f(this.cameraPositionLoc,0,0,0)}disableFragmentProgram(){this.gl&&this.gl.useProgram(null)}createFramebuffers(){if(!this.gl)return;let e=this.canvas.width,t=this.canvas.height,s=Math.floor(e/4),r=Math.floor(t/4);this.mainTexture&&this.gl.deleteTexture(this.mainTexture),this.mainFramebuffer&&this.gl.deleteFramebuffer(this.mainFramebuffer),this.bloomTextureA&&this.gl.deleteTexture(this.bloomTextureA),this.bloomFramebufferA&&this.gl.deleteFramebuffer(this.bloomFramebufferA),this.bloomTextureB&&this.gl.deleteTexture(this.bloomTextureB),this.bloomFramebufferB&&this.gl.deleteFramebuffer(this.bloomFramebufferB),this.tempTexture&&this.gl.deleteTexture(this.tempTexture),this.tempFramebuffer&&this.gl.deleteFramebuffer(this.tempFramebuffer),this.mainTexture=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.mainTexture),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,e,t,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.mainFramebuffer=this.gl.createFramebuffer(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.mainFramebuffer),this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,this.gl.COLOR_ATTACHMENT0,this.gl.TEXTURE_2D,this.mainTexture,0),this.bloomTextureA=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.bloomTextureA),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,s,r,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.bloomFramebufferA=this.gl.createFramebuffer(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferA),this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,this.gl.COLOR_ATTACHMENT0,this.gl.TEXTURE_2D,this.bloomTextureA,0),this.bloomTextureB=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.bloomTextureB),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,s,r,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.bloomFramebufferB=this.gl.createFramebuffer(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.bloomFramebufferB),this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,this.gl.COLOR_ATTACHMENT0,this.gl.TEXTURE_2D,this.bloomTextureB,0),this.gl.clearColor(0,0,0,0),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.tempTexture=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.tempTexture),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,s,r,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.tempFramebuffer=this.gl.createFramebuffer(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.tempFramebuffer),this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,this.gl.COLOR_ATTACHMENT0,this.gl.TEXTURE_2D,this.tempTexture,0),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.bindTexture(this.gl.TEXTURE_2D,null)}createQuadVAO(){if(!this.gl||!this.downsampleProgram||(this.quadVAO=this.gl.createVertexArray(),!this.quadVAO))return;this.gl.bindVertexArray(this.quadVAO);let e=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),t=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t),this.gl.bufferData(this.gl.ARRAY_BUFFER,e,this.gl.STATIC_DRAW);let s=this.gl.getAttribLocation(this.downsampleProgram,"a_position");this.gl.enableVertexAttribArray(s),this.gl.vertexAttribPointer(s,2,this.gl.FLOAT,!1,0,0),this.gl.bindVertexArray(null)}generateBeams(e,t){this.verts=[],this.texCoords=[],this.colours=[],this.norms=[],this.beamTypes=[],this.vertCount=0,this.vao=null,e.length!==0&&(this.generateBeamsFromPoints(e,t),this.norms=c.calcNormals(this.verts),this.vertCount=this.verts.length)}generateBeamsFromPoints(e,t){let s=null,r=[0,0,0],o=255;e.forEach(n=>{let a=this.framePointToWorld(n),m=[n.r*255,n.g*255,n.b*255];s&&(this.pushVertex(x[0],x[1],x[2]),this.pushColour(r[0],r[1],r[2],o),this.pushTexCoord(x[0],x[1],x[2]),this.beamTypes.push(0),this.pushVertex(s[0],s[1],s[2]),this.pushColour(r[0],r[1],r[2],o),this.pushTexCoord(s[0],s[1],s[2]),this.beamTypes.push(0),this.pushVertex(a[0],a[1],a[2]),this.pushColour(m[0],m[1],m[2],o),this.pushTexCoord(a[0],a[1],a[2]),this.beamTypes.push(0)),s=a,r=m});let l=this.beamIntensity*255;t.forEach(n=>{let a=this.framePointToWorld(n),m=[n.r*255,n.g*255,n.b*255];this.addBeamHold(a,m,l)})}framePointToWorld(e){this.laserDirection=[0,0,-4],this.rotationX=g.identity(),this.rotationY=g.identity(),this.rotationX=g.rotateX(this.rotationX,(e.x-.5)*_e),this.rotationY=g.rotateY(this.rotationY,(e.y-.5)*_e);let t=g.multiply(this.rotationY,this.rotationX);this.laserDirection=g.transformPoint(t,this.laserDirection);let s=this.laserDirection[0]-x[0],r=this.laserDirection[1]-x[1],o=this.laserDirection[2]-x[2];return d.create(-s,-r,o)}addBeamHold(e,t,s){let r=d.create(x[0],x[1],x[2]),o=d.normalize(d.subtract(e,r)),l=d.normalize(d.subtract(He,e)),n=d.cross(l,o);d.length(n)<1e-5&&(n=d.cross(o,[0,1,0])),d.length(n)<1e-5&&(n=d.cross(o,[1,0,0])),n=d.normalize(n);let a=d.normalize(d.cross(o,n));d.length(a)<1e-5&&(a=d.normalize(d.cross(o,l))),this.pushBeamQuad(r,e,n,t,s),this.pushBeamQuad(r,e,a,t,s)}pushBeamQuad(e,t,s,r,o){let l=d.mulScalar(s,qe),n=e,a=t,m=d.add(t,l),L=d.subtract(t,l),U=0,R=o;this.pushVertex(n[0],n[1],n[2]),this.pushColour(r[0],r[1],r[2],R),this.pushTexCoord(n[0],n[1],n[2]),this.beamTypes.push(1),this.pushVertex(a[0],a[1],a[2]),this.pushColour(r[0],r[1],r[2],R),this.pushTexCoord(a[0],a[1],a[2]),this.beamTypes.push(1),this.pushVertex(m[0],m[1],m[2]),this.pushColour(r[0],r[1],r[2],U),this.pushTexCoord(m[0],m[1],m[2]),this.beamTypes.push(1),this.pushVertex(n[0],n[1],n[2]),this.pushColour(r[0],r[1],r[2],R),this.pushTexCoord(n[0],n[1],n[2]),this.beamTypes.push(1),this.pushVertex(L[0],L[1],L[2]),this.pushColour(r[0],r[1],r[2],U),this.pushTexCoord(L[0],L[1],L[2]),this.beamTypes.push(1),this.pushVertex(a[0],a[1],a[2]),this.pushColour(r[0],r[1],r[2],R),this.pushTexCoord(a[0],a[1],a[2]),this.beamTypes.push(1)}pushVertex(e,t,s){this.verts.push(e,t,s),this.vertCount=this.verts.length}pushColour(e,t,s,r){this.colours.push(e,t,s,r)}pushTexCoord(e,t,s){this.texCoords.push(e,t,s)}static calcNormals(e){let t=new Array(e.length).fill(0),s=new Array(3),r=new Array(3);for(let o=0;o<e.length;o+=9){s[0]=e[o+3]-e[o],s[1]=e[o+4]-e[o+1],s[2]=e[o+5]-e[o+2],r[0]=e[o+6]-e[o],r[1]=e[o+7]-e[o+1],r[2]=e[o+8]-e[o+2];let l=s[1]*r[2]-s[2]*r[1],n=s[2]*r[0]-s[0]*r[2],a=s[0]*r[1]-s[1]*r[0];o>0&&o<e.length-9?(t[o-9]+=l,t[o-8]+=n,t[o-7]+=a,t[o-3]+=l,t[o-2]+=n,t[o-1]+=a,t[o+3]=t[o-3],t[o+4]=t[o-2],t[o+5]=t[o-1]):(t[o+3]=l,t[o+4]=n,t[o+5]=a),t[o]=l,t[o+1]=n,t[o+2]=a,t[o+6]=l,t[o+7]=n,t[o+8]=a}return e.length>=9&&(t[e.length-3]+=t[0],t[e.length-2]+=t[1],t[e.length-1]+=t[2],t[0]+=t[e.length-3],t[1]+=t[e.length-2],t[2]+=t[e.length-1]),t}static createProgram(e,t,s){let r=e.createProgram();if(!r)throw new Error("Unable to create shader program");let o=c.compileShader(e,e.VERTEX_SHADER,t),l=c.compileShader(e,e.FRAGMENT_SHADER,s);if(e.attachShader(r,o),e.attachShader(r,l),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let n=e.getProgramInfoLog(r)??"link failure";throw e.deleteShader(o),e.deleteShader(l),e.deleteProgram(r),new Error(`WebGL program link error: ${n}`)}return e.deleteShader(o),e.deleteShader(l),r}static compileShader(e,t,s){let r=e.createShader(t);if(!r)throw new Error("Unable to create shader");if(e.shaderSource(r,s),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let o=e.getShaderInfoLog(r)??"compile failure";throw e.deleteShader(r),new Error(`WebGL shader compile error: ${o}`)}return r}static create3DTexture(e,t){let s=e.createTexture();if(!s)throw new Error("Unable to create 3D texture");return e.bindTexture(e.TEXTURE_3D,s),e.texImage3D(e.TEXTURE_3D,0,e.R16F,t.width,t.height,t.depth,0,e.RED,e.FLOAT,t.data),s}static initTexture(e,t,s=!0){if(!t)return;let r=s?e.LINEAR:e.NEAREST;e.texParameteri(e.TEXTURE_3D,e.TEXTURE_MIN_FILTER,r),e.texParameteri(e.TEXTURE_3D,e.TEXTURE_MAG_FILTER,r),e.texParameteri(e.TEXTURE_3D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_3D,e.TEXTURE_WRAP_T,e.REPEAT),e.texParameteri(e.TEXTURE_3D,e.TEXTURE_WRAP_R,e.REPEAT),e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_3D,t)}};function re(){(async function(){let c=document.getElementById("laser-canvas");if(!c){console.warn("Laser canvas element not found");return}console.log("Initializing Laser Renderer...");let e=c.dataset.smokeTexture;if(!e){console.error("Smoke texture URL not found in canvas data-smoke-texture attribute");return}let t=await fetch(e),s=new Uint8Array(await t.arrayBuffer()),r=new M(c);r.initialize(s),r.setBeamIntensity(1);let o={circle:[],line:[],triangle:[],square:[]};for(let h=0;h<=20;h++){let f=h/20*Math.PI*2;o.circle.push({x:Math.cos(f),y:Math.sin(f)})}o.line.push({x:-1,y:0},{x:1,y:0}),o.triangle.push({x:0,y:-1},{x:.866,y:.5},{x:-.866,y:.5},{x:0,y:-1}),o.square.push({x:-1,y:-1},{x:1,y:-1},{x:1,y:1},{x:-1,y:1},{x:-1,y:-1});function l(h,f,b){let i=(1-Math.abs(2*b-1))*f,u=i*(1-Math.abs(h/60%2-1)),E=b-i/2,p=0,T=0,v=0;return h>=0&&h<60?(p=i,T=u,v=0):h>=60&&h<120?(p=u,T=i,v=0):h>=120&&h<180?(p=0,T=i,v=u):h>=180&&h<240?(p=0,T=u,v=i):h>=240&&h<300?(p=u,T=0,v=i):(p=i,T=0,v=u),{r:p+E,g:T+E,b:v+E}}let n=8,a=[],m=["circle","line","triangle","square"];for(let h=0;h<n;h++){let f=Math.random()*360,b=l(f,1,.5);a.push({x:Math.random(),y:Math.random(),vx:0,vy:0,rotation:Math.random()*Math.PI*2,rotationSpeed:.2,scale:.015+Math.random()*.015,shape:m[Math.floor(Math.random()*m.length)],r:b.r,g:b.g,b:b.b})}let L={x:.5,y:.2,scaleX:.15,scaleY:.15,rotation:0,scrollInfluence:0,rotationSpeed:1},U=.5,R=.5,G=!1,O=null,ie=null,W=!1,se=0,oe=0,ae=.5,ne=.5,Z=[];window.addEventListener("mousemove",h=>{G||(U=h.clientX/window.innerWidth,R=h.clientY/window.innerHeight)}),document.addEventListener("mouseleave",()=>{G||(U=.5,R=.5)}),c.addEventListener("click",h=>{let f=c.getBoundingClientRect(),b=(h.clientX-f.left)/f.width,i=(h.clientY-f.top)/f.height;W?window.unFocusLaserRenderer():window.focusLaserRenderer(b,i,1e3)});let le=3e-4,Qe=.01,he=3e-6,Ae=.05,ue=0,Re=.02,$e=.003,ce=.98;function K(){if(G&&(U=.5,R=.5,(O?(Date.now()-O)/1e3:0)>=3)){ie=requestAnimationFrame(K),console.log("Laser renderer animation paused after 3 seconds");let i=[];for(let u of a){let E=o[u.shape],p=Math.cos(u.rotation),T=Math.sin(u.rotation),v=E[0],I=v.x*u.scale,S=v.y*u.scale,me=I*p-S*T,X=I*T+S*p;i.push({x:u.x+me,y:u.y+X,r:0,g:0,b:0});for(let z of E){let H=z.x*u.scale,N=z.y*u.scale,q=H*p-N*T,j=H*T+N*p,J=u.x+q,ee=u.y+j;i.push({x:J,y:ee,r:u.r,g:u.g,b:u.b})}let P=E[E.length-1],y=P.x*u.scale,V=P.y*u.scale,Y=y*p-V*T,k=y*T+V*p;i.push({x:u.x+Y,y:u.y+k,r:0,g:0,b:0})}r.updatePoints({points:i,beams:i});return}let h=Date.now()*.001,f=[];for(let b=0;b<a.length;b++){let i=a[b];if(W){let w=Date.now()-se,F=Math.min(w/oe,1),D=F<.5?2*F*F:1-Math.pow(-2*F+2,2)/2,_=Z[b];_&&(i.x=_.x+(ae-_.x)*D,i.y=_.y+(ne-_.y)*D),i.vx=0,i.vy=0,i.rotation+=i.rotationSpeed*.01;let A=o[i.shape],C=Math.cos(i.rotation),B=Math.sin(i.rotation),fe=A[0],de=fe.x*i.scale,ge=fe.y*i.scale,Fe=de*C-ge*B,Le=de*B+ge*C;f.push({x:i.x+Fe,y:i.y+Le,r:0,g:0,b:0});for(let xe of A){let ve=xe.x*i.scale,Ee=xe.y*i.scale,we=ve*C-Ee*B,De=ve*B+Ee*C,Ue=i.x+we,Ce=i.y+De;f.push({x:Ue,y:Ce,r:i.r,g:i.g,b:i.b})}let be=A[A.length-1],pe=be.x*i.scale,Te=be.y*i.scale,Pe=pe*C-Te*B,ye=pe*B+Te*C;f.push({x:i.x+Pe,y:i.y+ye,r:0,g:0,b:0});continue}let u=0,E=0;for(let w=0;w<a.length;w++){if(b===w)continue;let F=a[w],D=i.x-F.x,_=i.y-F.y,A=Math.sqrt(D*D+_*_);A<i.scale*5&&A>.001&&(u+=D/A*he,E+=_/A*he)}i.vx+=u,i.vy+=E;let p=i.x-.5,T=i.y-.5,v=Math.sqrt(p*p+T*T);v<Re&&v>.001&&(i.vx+=p/v*ue,i.vy+=T/v*ue);let I=U-i.x,S=R-i.y;Math.sqrt(I*I+S*S)>Ae&&(i.vx+=I*le,i.vy+=S*le),i.vx*=ce,i.vy*=ce,i.x+=i.vx,i.y+=i.vy,i.rotation+=i.rotationSpeed*.01;let X=o[i.shape],P=Math.cos(i.rotation),y=Math.sin(i.rotation),V=X[0],Y=V.x*i.scale,k=V.y*i.scale,z=Y*P-k*y,H=Y*y+k*P;f.push({x:i.x+z,y:i.y+H,r:0,g:0,b:0});for(let w of X){let F=w.x*i.scale,D=w.y*i.scale,_=F*P-D*y,A=F*y+D*P,C=i.x+_,B=i.y+A;f.push({x:C,y:B,r:i.r,g:i.g,b:i.b})}let N=X[X.length-1],q=N.x*i.scale,j=N.y*i.scale,J=q*P-j*y,ee=q*y+j*P;f.push({x:i.x+J,y:i.y+ee,r:0,g:0,b:0})}r.updatePoints({points:f,beams:f}),ie=requestAnimationFrame(K)}window.pauseLaserRenderer=()=>{G=!0,O=Date.now(),U=.5,R=.5,console.log("Laser renderer paused, will stop animation after 5 seconds")},window.resumeLaserRenderer=()=>{G=!1,O=null,console.log("Laser renderer resumed")},window.focusLaserRenderer=(h,f,b)=>{W=!0,se=Date.now(),oe=b,ae=h,ne=f,Z=a.map(i=>({x:i.x,y:i.y})),console.log(`Laser renderer focusing to (${h}, ${f}) over ${b}ms`)},window.unFocusLaserRenderer=()=>{W=!1,Z=[],console.log("Laser renderer unfocused, returning to orbital physics")},K(),window.addEventListener("resize",()=>{r.resize()}),setTimeout(()=>r.resize(),100)})()}typeof window<"u"&&(document.readyState==="loading"?(console.log("Waiting for DOMContentLoaded to initialize Laser Background..."),document.addEventListener("DOMContentLoaded",re)):(console.log("DOM already loaded, initializing Laser Background..."),re()));return Ge(je);})();
