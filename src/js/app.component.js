import { Component, getContext } from 'rxcomp';
// import UserService from './user/user.service';
import { FormControl, FormGroup } from 'rxcomp-form';
import { first, takeUntil } from 'rxjs/operators';
import AgoraService, { MessageType, RoleType } from './agora/agora.service';
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
		const defaultInput = this.defaultInput = {
			deviceId: 'video-01',
			label: 'equirectangular',
			kind: 'videoplayer',
			src: './video/equirectangular_low.mp4',
		};
		const defaultDevices = {
			videos: [defaultInput],
			audios: [Object.assign({}, defaultInput, {
				deviceId: 'audio-01',
			})]
		};
		this.devices = defaultDevices;
		this.items = [];
		this.item = null;
		this.form = null;
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

	initForm() {
		const form = this.form = new FormGroup({
			video: new FormControl(null),
			audio: new FormControl(null),
		});
		const formControls = this.formControls = form.controls;
		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			console.log('form.changes$', changes, form.valid);
		});
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
			this.state.connecting = true;
			this.pushChanges();
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
