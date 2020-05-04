import { Directive, getContext } from "rxcomp";

export class SrccDirective extends Directive {

	onChanges() {
		const { node } = getContext(this);
		if (this.srcc) {
			if (node.getAttribute('src') !== this.srcc) {
				node.setAttribute('src', this.srcc);
			}
		} else {
			node.removeAttribute('src');
		}
	}

}

SrccDirective.meta = {
	selector: '[[srcc]]',
	inputs: ['srcc'],
};
