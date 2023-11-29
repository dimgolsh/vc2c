console.log(1);
import { convert } from './index';

const defaultCode = `import { Component, Prop, Vue } from 'common/vue';
import { IQAErrorModel } from 'api/smartcat/segments';
import i18n from '@/common/i18n';

@Component({ i18n })
export default class ErrorsTip extends Vue {
	@Prop(Array)
	errors: IQAErrorModel[];

	getClass(isCritical: boolean) {
		return { 'l-qa-errors-tip__row_critical': isCritical };
	}
}`;

const vc2cConfig = {
	compatible: false,
	debug: true,
};

const v = convert(defaultCode, vc2cConfig);

console.log(v);
