import { Component, getContext } from 'rxcomp';
import { takeUntil, tap } from 'rxjs/operators';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import AgoraService, { AgoraRemoteEvent, MessageType } from '../agora/agora.service';
import { DEBUG } from '../const';
import { DragDownEvent, DragMoveEvent, DragService, DragUpEvent } from '../drag/drag.service';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rect } from '../rect/rect';
import { Panorama } from './panorama';

export class WorldComponent extends Component {

	onInit() {
		// console.log('WorldComponent.onInit');
		this.items = [];
		this.index = 0;
		this.createScene();
		this.addListeners();
		/*
		this.panorama.loadRgbe(this.item, this.renderer, (envMap) => {
			// this.scene.background = envMap;
			this.scene.environment = envMap;
			this.render();
		});
		*/
		this.animate(); // !!! no
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	onDestroy() {
		this.removeListeners();
		const renderer = this.renderer;
		renderer.setAnimationLoop(() => {});
	}

	createScene() {
		const { node } = getContext(this);
		this.size = { width: 0, height: 0, aspect: 0 };

		const container = this.container = node.querySelector('.world__view');
		const info = this.info = node.querySelector('.world__info');

		const worldRect = this.worldRect = Rect.fromNode(container);
		const cameraRect = this.cameraRect = new Rect();

		const camera = this.camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 1000);
		camera.position.set(0, 1, 3);
		camera.target = new THREE.Vector3();
		camera.lookAt(camera.target);

		const renderer = this.renderer = new THREE.WebGLRenderer({
			antialias: false,
			alpha: false,
			// physicallyCorrectLights: true,
		});
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.offsetWidth, container.offsetHeight);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.8;
		renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.xr.enabled = true;
		if (container.childElementCount > 0) {
			container.insertBefore(renderer.domElement, container.children[0]);
		} else {
			container.appendChild(renderer.domElement);
		}

		document.body.appendChild(VRButton.createButton(renderer));

		/*
		const controls = this.controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		controls.enableKeys = false;
		controls.minDistance = 2;
		controls.maxDistance = 10;
		controls.target.set(0, 0, 0);
		controls.update();
		*/

		this.drag$().pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(event => {
			// console.log('dragService', event);
		});

		const scene = this.scene = new THREE.Scene();

		const panorama = this.panorama = new Panorama();
		// panorama.playVideo('video/equirectangular.webm');
		scene.add(panorama.mesh);

		const objects = this.objects = new THREE.Group();
		scene.add(objects);

		/*
		const light = new THREE.DirectionalLight(0xffffff, 0.5);
		light.position.set(0, 2, 2);
		light.target.position.set(0, 0, 0);
		scene.add(light);
		*/

		this.resize();
	}

	drag$() {
		let rotation;
		return DragService.events$(this.node).pipe(
			tap((event) => {
				const panorama = this.panorama;
				if (event instanceof DragDownEvent) {
					rotation = panorama.mesh.rotation.clone();
				} else if (event instanceof DragMoveEvent) {
					this.panorama.mesh.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01 + Math.PI, 0);
					// this.render();
					// this.rotate.next([panorama.x, panorama.y, panorama.z]);
					/*
					if (this.agora && this.agora.state.control) {
						this.agora.sendMessage({
							type: MessageType.SlideRotate,
							coords: [panorama.x, panorama.y, group.rotation.z]
						});
					}
					*/
				} else if (event instanceof DragUpEvent) {

				}
			})
		);
	}

	onTween() {
		this.render();
	}

	onChange(index) {
		this.index = index;
		this.change.next(index);
	}

	updateRaycaster() {
		try {
			/*
			const controllers = this.controllers;
			const controller = controllers.controller;
			if (controller) {
				const raycaster = this.raycaster;
				const position = controller.position;
				const rotation = controller.getWorldDirection(controllers.controllerDirection).multiplyScalar(-1);
				raycaster.set(position, rotation);
				const hit = InteractiveMesh.hittest(raycaster, controllers.gamepads.button);
			}
			*/
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	render(delta) {
		try {
			/*
			const time = performance.now();
			const tick = this.tick_ ? ++this.tick_ : this.tick_ = 1;
			const objects = this.objects;
			for (let i = 0; i < objects.children.length; i++) {
				const x = objects.children[i];
				if (typeof x.userData.render === 'function') {
					x.userData.render(time, tick);
				}
			}
			*/
			const renderer = this.renderer,
				scene = this.scene,
				camera = this.camera;
			renderer.render(scene, camera);
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	animate() {
		const renderer = this.renderer;
		renderer.setAnimationLoop(this.render);
	}

	resize() {
		try {
			const container = this.container,
				renderer = this.renderer,
				camera = this.camera;
			const size = this.size;
			size.width = container.offsetWidth;
			size.height = container.offsetHeight;
			size.aspect = size.width / size.height;
			const worldRect = this.worldRect;
			worldRect.setSize(size.width, size.height);
			if (renderer) {
				renderer.setSize(size.width, size.height);
			}
			if (camera) {
				camera.aspect = size.width / size.height;
				const angle = camera.fov * Math.PI / 180;
				const height = Math.abs(camera.position.z * Math.tan(angle / 2) * 2);
				const cameraRect = this.cameraRect;
				cameraRect.width = height * camera.aspect;
				cameraRect.height = height;
				// console.log('position', camera.position.z, 'angle', angle, 'height', height, 'aspect', camera.aspect, cameraRect);
				camera.updateProjectionMatrix();
			}
			this.render();
		} catch (error) {
			this.info.innerHTML = error;
		}
	}

	addListeners() {
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
		// this.controls.addEventListener('change', this.render); // use if there is no animation loop
		window.addEventListener('resize', this.resize, false);
		if (!DEBUG) {
			const agora = this.agora = AgoraService.getSingleton();
			agora.events$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(event => {
				if (event instanceof AgoraRemoteEvent) {
					setTimeout(() => {
						this.panorama.setVideo(event.element.querySelector('video'));
					}, 500);
				}
			});
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				switch (message.type) {
					case MessageType.HlsEvent:
						if (message.src) {
							/*
					if (Hls.isSupported()) {
						var video = document.getElementById('video');
						var hls = new Hls();
						// bind them together
						hls.attachMedia(video);
						hls.on(Hls.Events.MEDIA_ATTACHED, function () {
						  console.log("video and hls.js are now bound together !");
						  hls.loadSource("http://my.streamURL.com/playlist.m3u8");
						  hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
							console.log("manifest loaded, found " + data.levels.length + " quality level");
						  });
						});
					  }
					  */
						}
						break;
					case MessageType.SlideRotate:
						if (agora.state.locked && message.coords) {
							const group = this.objects.children[this.index];
							group.rotation.set(message.coords[0], message.coords[1], message.coords[2]);
							this.panorama.mesh.rotation.set(message.coords[0], message.coords[1] + Math.PI, message.coords[2]);
							this.render();
						}
						/*
						const group = this.objects.children[this.index];
						if (event instanceof DragDownEvent) {
							rotation = group.rotation.clone();
						} else if (event instanceof DragMoveEvent) {
							group.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01, 0);
							this.panorama.mesh.rotation.set(rotation.x + event.distance.y * 0.01, rotation.y + event.distance.x * 0.01 + Math.PI, 0);
							this.render();
							this.rotate.next([group.rotation.x, group.rotation.y, group.rotation.z]);
						} else if (event instanceof DragUpEvent) {

						}
						*/
						break;
				}
			});
			agora.state$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(state => {
				this.state = state;
				// console.log(state);
				// this.pushChanges();
			});
		}
	}

	removeListeners() {
		window.removeEventListener('resize', this.resize, false);
		// this.controls.removeEventListener('change', this.render);
	}

}

WorldComponent.meta = {
	selector: '[world]',
	inputs: ['items', 'item'],
	outputs: ['change', 'rotate'],
};
