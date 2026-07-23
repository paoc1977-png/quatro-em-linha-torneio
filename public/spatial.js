import * as THREE from '/vendor/three.module.min.js';

export class SpatialBoard{
  constructor(host,ui,play){
    Object.assign(this,{host,ui,play,enabled:false,az:.74,el:.48,dist:8.2});
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(38,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xfff7e8,0x243247,2.1));
    const light=new THREE.DirectionalLight(0xffffff,3.2);
    light.position.set(-4,8,5);
    light.castShadow=true;
    this.scene.add(light);
    this.root=new THREE.Group();
    this.scene.add(this.root);

    const base=new THREE.Mesh(
      new THREE.BoxGeometry(4.2,.36,4.2),
      new THREE.MeshPhysicalMaterial({color:0x183963,metalness:.45,roughness:.22,clearcoat:1})
    );
    base.position.y=-.18;
    this.root.add(base);
    const pillarGeometry=new THREE.CylinderGeometry(.055,.065,3.62,20);
    const pillarMaterial=new THREE.MeshStandardMaterial({color:0xdbe5eb,metalness:.9,roughness:.18});
    const socketGeometry=new THREE.CylinderGeometry(.13,.13,.09,24);
    const socketMaterial=new THREE.MeshStandardMaterial({color:0x7fa1bf,metalness:.7,roughness:.25});
    this.selectors=[];
    for(let x=0;x<4;x++)for(let z=0;z<4;z++){
      const px=(x-1.5)*.88,pz=(z-1.5)*.88;
      const socket=new THREE.Mesh(socketGeometry,socketMaterial);
      socket.position.set(px,.08,pz);
      this.root.add(socket);
      const pillar=new THREE.Mesh(pillarGeometry,pillarMaterial);
      pillar.position.set(px,1.88,pz);
      this.root.add(pillar);
      const pick=new THREE.Mesh(
        new THREE.TorusGeometry(.19,.035,10,32),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0})
      );
      pick.position.set(px,3.84,pz);
      pick.userData={x,z};
      this.selectors.push(pick);
      this.root.add(pick);
    }

    this.pieces=new THREE.Group();
    this.root.add(this.pieces);
    this.target=new THREE.Vector3(0,1.55,0);
    this.pointer=new THREE.Vector2();
    this.ray=new THREE.Raycaster();
    this.bindControls();
    new ResizeObserver(()=>this.resize()).observe(host);
    this.cameraPos();
    this.resize();
    const draw=()=>{
      requestAnimationFrame(draw);
      this.renderer.render(this.scene,this.camera);
    };
    draw();
  }

  bindControls(){
    let drag=false,moved=false,lx=0,ly=0,downX=0,downY=0;
    const canvas=this.renderer.domElement;
    canvas.onpointerdown=e=>{
      drag=true;moved=false;lx=downX=e.clientX;ly=downY=e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove=e=>{
      if(!drag)return;
      if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)moved=true;
      if(moved){
        this.az-=(e.clientX-lx)*.009;
        this.el=Math.max(.18,Math.min(1.18,this.el+(e.clientY-ly)*.007));
        this.cameraPos();
      }
      lx=e.clientX;ly=e.clientY;
    };
    canvas.onpointerup=e=>{
      if(!moved&&this.enabled){
        const r=canvas.getBoundingClientRect();
        this.pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));
        this.ray.setFromCamera(this.pointer,this.camera);
        const hit=this.ray.intersectObjects(this.selectors)[0]?.object;
        if(hit)this.play(hit.userData.x,hit.userData.z);
      }
      drag=false;
    };
    canvas.onwheel=e=>{
      e.preventDefault();
      this.dist=Math.max(6.2,Math.min(11,this.dist+e.deltaY*.006));
      this.cameraPos();
    };
    this.ui.near.onclick=()=>{this.dist=Math.max(6.2,this.dist-.7);this.cameraPos()};
    this.ui.far.onclick=()=>{this.dist=Math.min(11,this.dist+.7);this.cameraPos()};
    this.ui.home.onclick=()=>{this.az=.74;this.el=.48;this.dist=8.2;this.cameraPos()};
  }

  cameraPos(){
    const horizontal=Math.cos(this.el)*this.dist;
    this.camera.position.set(
      Math.sin(this.az)*horizontal,
      this.target.y+Math.sin(this.el)*this.dist,
      Math.cos(this.az)*horizontal
    );
    this.camera.lookAt(this.target);
    this.ui.map.style.setProperty('--map-angle',`${this.az}rad`);
    this.ui.map.style.setProperty('--map-counter-angle',`${-this.az}rad`);
  }

  resize(){
    const box=this.host.getBoundingClientRect();
    this.renderer.setSize(box.width,box.height,false);
    this.camera.aspect=box.width/Math.max(1,box.height);
    this.camera.updateProjectionMatrix();
  }

  update(cells,enabled){
    this.enabled=enabled;
    this.pieces.clear();
    for(const cell of cells){
      const piece=new THREE.Mesh(
        new THREE.SphereGeometry(.34,30,20),
        new THREE.MeshPhysicalMaterial({
          color:cell.colour==='red'?0xe83f52:0xffc928,
          roughness:.19,
          clearcoat:1
        })
      );
      piece.position.set((cell.x-1.5)*.88,.38+cell.y*.76,(cell.z-1.5)*.88);
      this.pieces.add(piece);
    }
    this.ui.map.innerHTML=Array.from({length:4},(_,z)=>
      Array.from({length:4},(_,x)=>{
        const count=cells.filter(cell=>cell.x===x&&cell.z===z).length;
        return `<button data-x="${x}" data-z="${z}" ${!enabled||count===4?'disabled':''}>${count||''}</button>`;
      }).join('')
    ).join('');
    this.ui.map.querySelectorAll('button').forEach(
      button=>button.onclick=()=>this.play(+button.dataset.x,+button.dataset.z)
    );
  }
}
