import * as THREE from 'three';
import { ModelComponent } from './model.component';
import { WorldComponent } from './world.component';

export class ModelPictureComponent extends ModelComponent {

	onInit() {
		super.onInit();
		console.log('ModelPictureComponent.onInit');
	}

	create(callback) {
		const mesh = new THREE.Group();
		if (typeof callback === 'function') {
			callback(mesh);
		}
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}
}

ModelPictureComponent.meta = {
	selector: '[model-picture]',
	hosts: { host: WorldComponent },
	inputs: ['item'],
};
