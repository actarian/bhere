import * as THREE from 'three';
import { ModelComponent } from './model.component';
import { WorldComponent } from './world.component';

export class ModelTextComponent extends ModelComponent {

	onInit() {
		super.onInit();
		console.log('ModelTextComponent.onInit');
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

ModelTextComponent.meta = {
	selector: '[model-text]',
	hosts: { host: WorldComponent },
	inputs: ['item'],
};
