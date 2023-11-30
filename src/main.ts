console.log(1);
import { convert } from './index';

const defaultCode = `import { Component, Vue } from 'common/vue';
import i18n from './i18n';
import { inject } from 'common/di';
import { INotificationModel } from '@/services/notifications';
import { ScText } from '@smartcat/design-system';

@Component({ components: { NotificationTemplate, MdButton } })
export default class Notification extends Vue {
	@Prop({ type: Object, required: true })
	public value: INotificationModel;

    @Prop({ type: Boolean, required: true })
	public value: boolean;

	public get hasOkButton() {
		return Boolean(this.value?.okText);
	}

	public get hasCancelButton() {
		return Boolean(this.value?.cancelText);
	}

	public close(value: boolean) {
		this.$emit('close', value);
	}
}`;

const vc2cConfig = {
	compatible: false,
	debug: true,
};

const v = convert(defaultCode, vc2cConfig);

console.log(v);
