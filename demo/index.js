import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'
import { convert } from '../src/index'

const defaultCode = `import { Component, Vue } from 'common/vue';
import i18n from './i18n';
import { inject } from 'common/di';
import { INotificationModel } from '@/services/notifications';
import { ScText } from '@smartcat/design-system';

@Component({ i18n, components: { NotificationTemplate, MdButton } })
export default class Notification extends Vue {
	@Prop({ type: Object, required: true })
	public value: INotificationModel;

    @Prop(Array)
	errors: IQAErrorModel[];

    @Prop({ type: Array, required: true })
	tqs: IQAErrorModel[];

    @Prop({ type: Boolean, required: true })
	public value: boolean;

	private readonly segmentsService = inject(SegmentsService);
	private readonly languagesStore = inject(LanguagesStore);

	get cancelButtonText() {
		return this.cancelButton ? this.cancelButton : (this.$t('Cancel') as string);
	}

	get isTargetLanguageRTL() {
		return this.languagesStore.isTargetLanguageRTL;
	}

	get disabled() {
		return !this.segmentsService.canEditActiveSegment;
	}

	isShownResults = true

	mounted() {
		this.$nextTick();
		(this.$refs.inputLabel as HTMLElement).focus();
		const { y, height } = (this.$refs.labelbutton as HTMLElement).getBoundingClientRect();
		const layout = document.getElementById('layout-top-left-container').clientHeight;
	}


	created() {
	
		this.$watch(
			() => this.tqs,
			(value) => {
				this.$emit('tqs-changed', value);
			},
		);
	}

	public get hasOkButton() {
		return Boolean(this.value?.okText);
	}

	public get hasCancelButton() {
		return Boolean(this.value?.cancelText);
	}

	public close(value: boolean) {
		this.$emit('close', value);
	}
}`

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.js'
    }
    return './editor.worker.js'
  }
}

const vc2cConfig = {
  compatible: false
}

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  experimentalDecorators: true,
  noResolve: true,
  target: 'esnext',
  allowNonTsExtensions: true,
  noEmit: true,
  lib: [
    'esnext',
    'dom',
    'dom.iterable',
    'scripthost'
  ],
  module: 'esnext',
  strict: true,
  esModuleInterop: true,
  resolveJsonModule: true
})

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: defaultCode,
  language: 'typescript',
  theme: 'vs-dark',
  minimap: {
    enabled: false
  }
})

const output = monaco.editor.create(document.getElementById('output'), {
  value: convert(defaultCode, vc2cConfig),
  language: 'typescript',
  theme: 'vs-dark'
})

const setOutput = () => {
  output.setValue(convert(editor.getValue(), vc2cConfig))
}

editor.onDidChangeModelContent(() => {
  setOutput()
})

window.addEventListener('resize', () => {
  editor.layout()
  output.layout()
})

const compatibleCheckbox = document.getElementById('compatible')
compatibleCheckbox.addEventListener('change', () => {
  vc2cConfig.compatible = compatibleCheckbox.checked
  setOutput()
})
