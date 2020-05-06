import { Component, getContext } from 'rxcomp';
// import UserService from './user/user.service';
import { FormControl, FormGroup, RequiredValidator } from 'rxcomp-form';
import { first, takeUntil } from 'rxjs/operators';
import AgoraService, { MessageType, RoleType, StreamQualities } from './agora/agora.service';
import { BASE_HREF, DEBUG } from './const';
import HttpService from './http/http.service';
import LocationService from './location/location.service';
import ModalService, { ModalResolveEvent } from './modal/modal.service';

const CONTROL_REQUEST = BASE_HREF + 'control-request.html';
const TRY_IN_AR = BASE_HREF + 'try-in-ar.html';

export class AppComponent extends Component {

	onInit() {
		const { node } = getContext(this);
		node.classList.remove('hidden');
		const defaultVideo = this.defaultVideo = {
			deviceId: 'video-01',
			label: 'equirectangular',
			kind: 'videoplayer',
			src: './video/equirectangular_4K.mp4',
		};
		const defaultAudio = this.defaultAudio = {
			deviceId: 'audio-01',
			label: 'equirectangular',
			kind: 'videoplayer',
			src: './video/equirectangular_4K.mp4',
		};
		const defaultDevices = {
			videos: [defaultVideo],
			audios: [defaultAudio]
		};
		this.devices = defaultDevices;
		this.items = [];
		this.item = null;
		this.hls = null;
		this.initForm();
		// this.initForm();
		if (!DEBUG) {
			const agora = this.agora = AgoraService.getSingleton(defaultDevices);
			this.state = agora.state;
			this.devices = agora.state.devices;
			agora.devices$().subscribe(devices => {
				// console.log('AppComponent.devices$', devices);
				/*
				this.formControls.video.options = devices.videos.map(x => {
					return {
						id: x.deviceId,
						name: x.label,
					};
				});
				this.formControls.audio.options = devices.audios.map(x => {
					return {
						id: x.deviceId,
						name: x.label,
					};
				});
				*/
				this.devices = devices;
				this.pushChanges();
			});
			// agora.checkMediaDevices$({ audio: true }).subscribe(stream => console.log('AppComponent.checkMediaDevices', stream));
			agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				// console.log('AppComponent.message', message);
				switch (message.type) {
					case MessageType.RequestControl:
						this.onRemoteControlRequest(message);
						break;
					case MessageType.RequestControlAccepted:
						agora.sendMessage({
							type: MessageType.MenuNavTo,
							id: this.item.id,
						});
						break;
				}
			});
			agora.state$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(state => {
				// console.log('AppComponent.state', state);
				this.state = state;
				this.pushChanges();
			});
		} else {
			this.state = {
				role: LocationService.get('role') || RoleType.Attendee,
				connecting: false,
				connected: true,
				locked: false,
				control: false,
				cameraMuted: false,
				audioMuted: false,
				devices: defaultDevices,
			};
		}
		// this.loadData();
	}

	initForm() {
		const form = this.form = new FormGroup({
			streamUrl: new FormControl('https://bitmovin-a.akamaihd.net/content/playhouse-vr/m3u8s/105560.m3u8'),
			quality: new FormControl(StreamQualities[0].id, new RequiredValidator()),
		});
		const formControls = this.formControls = form.controls;
		formControls.quality.options = StreamQualities;
		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			console.log('form.changes$', changes, form.valid);
			if (changes.streamUrl && changes.streamUrl.indexOf('.m3u8') !== -1) {
				this.agora.addStreamDevice(changes.streamUrl);
				this.hls = changes.streamUrl;
			} else {
				this.agora.removeStreamDevice();
				this.hls = null;
			}
			this.pushChanges();
		});
	}

	onFileDrop(event) {
		event.preventDefault();
		const setSrc = (src) => {
			this.defaultVideo.src = src;
			this.defaultAudio.src = src;
			this.pushChanges();
		};
		let src = event.dataTransfer.getData('url');
		if (src) {
			setSrc(src);
		} else {
			const file = event.dataTransfer.files[0];
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.addEventListener('load', () => {
				this.defaultVideo.label = file.name;
				this.defaultAudio.label = file.name;
				src = reader.result;
				setSrc(src);
			}, false);
		}
	}

	availableVideos() {
		return this.state.devices.videos.filter(x => x.kind === 'videoinput' || this.state.role === RoleType.Publisher);
	}

	availableAudios() {
		return this.state.devices.audios.filter(x => x.kind === 'audioinput' || this.state.role === RoleType.Publisher);
	}

	setVideo(device) {
		const devices = this.devices;
		// console.log('setVideo', device.label, device.deviceId);
		devices.video = (devices.video === device) ? null : device;
		if (this.state.role === RoleType.Publisher) {
			this.agora.patchState({ mediaEnabled: Boolean(devices.video) });
		} else {
			this.pushChanges();
		}
	}

	setAudio(device) {
		const devices = this.devices;
		// console.log('setAudio', device.label, device.deviceId);
		devices.audio = (devices.audio === device) ? null : device;
		if (this.state.role === RoleType.Attendee) {
			this.agora.patchState({ mediaEnabled: Boolean(devices.audio) });
		} else {
			this.pushChanges();
		}
	}

	onPrevent(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	loadData() {
		HttpService.get$('./api/data.json').pipe(
			first()
		).subscribe(data => {
			this.data = data;
			// this.initForm();
		});
	}

	connect() {
		if (!this.state.connecting) {
			let quality = this.agora.state.role === RoleType.Attendee ?
				StreamQualities[StreamQualities.length - 1] :
				StreamQualities.find(x => x.id === this.formControls.quality.value);
			this.agora.patchState({ connecting: true, quality, streamUrl: this.formControls.streamUrl.value });
			setTimeout(() => {
				this.agora.connect$().pipe(
					takeUntil(this.unsubscribe$)
				).subscribe((state) => {
					this.state = Object.assign(this.state, state);
					this.pushChanges();
				});
			}, 1000);
		}
	}

	disconnect() {
		this.state.connecting = false;
		if (!DEBUG) {
			this.agora.leaveChannel();
		} else {
			this.state.connected = false;
			this.pushChanges();
		}
	}

	onChange(index) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideChange,
				index
			});
		}
	}

	onRotate(coords) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideRotate,
				coords
			});
		}
	}

	onRemoteControlRequest(message) {
		ModalService.open$({ src: CONTROL_REQUEST, data: null }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			if (event instanceof ModalResolveEvent) {
				message.type = MessageType.RequestControlAccepted;
				this.state.locked = true;
			} else {
				message.type = MessageType.RequestControlRejected;
				this.state.locked = false;
			}
			if (!DEBUG) {
				this.agora.sendMessage(message);
			}
			this.pushChanges();
		});
	}

	onDropped(id) {
		console.log('AppComponent.onDropped', id);
	}

	parseQueryString() {
		const action = LocationService.get('action');
		switch (action) {
			case 'login':
				this.openLogin();
				break;
			case 'register':
				this.openRegister();
				break;
		}
	}

	onSubmit() {
		console.log('AppComponent.onSubmit');
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

	toggleCamera() {
		if (!DEBUG) {
			this.agora.toggleCamera();
		}
	}

	toggleAudio() {
		if (!DEBUG) {
			this.agora.toggleAudio();
		}
	}

	toggleControl() {
		if (!DEBUG) {
			this.agora.toggleControl();
		} else {
			this.onRemoteControlRequest({});
		}
	}

	addToWishlist() {
		if (!this.item.added) {
			this.item.added = true;
			this.item.likes++;
			this.pushChanges();
		}
	}

	tryInAr() {
		ModalService.open$({ src: TRY_IN_AR, data: this.item }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			// this.pushChanges();
		});
	}

}

AppComponent.meta = {
	selector: '[app-component]',
};
