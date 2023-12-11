import { convert } from './index';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as monaco from 'monaco-editor';

import { ScriptTarget } from 'typescript';
import { Vc2cOptions } from './options';
console.log(1);

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
}`;

const vc2cConfig = {
	compatible: false,
	debug: true,
};

function init(code: string, options: Partial<Vc2cOptions>) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	self.MonacoEnvironment = {
		getWorker(_: any, label: string) {
			if (label === 'typescript' || label === 'javascript') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, new-cap
				return new tsWorker();
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, new-cap
			return new editorWorker();
		},
	};
	monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		experimentalDecorators: true,
		noResolve: true,
		target: ScriptTarget.ESNext,
		allowNonTsExtensions: true,
		noSemanticValidation: true,
		noSyntaxValidation: true,
		noImplicitAny: false,
		noEmit: true,
		lib: ['esnext', 'dom', 'dom.iterable', 'scripthost'],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		module: 'esnext' as any,
		strict: false,
		esModuleInterop: true,
		resolveJsonModule: true,
	});

	const editor = monaco.editor.create(document.getElementById('editor')!, {
		value: code,
		language: 'typescript',
		theme: 'vs-dark',
		minimap: {
			enabled: false,
		},
	});

	const output = monaco.editor.create(document.getElementById('output')!, {
		value: convert(code, options),
		language: 'typescript',
		theme: 'vs-dark',
		minimap: {
			enabled: false,
		},
	});

	const setOutput = () => {
		try {
			output.setValue(convert(editor.getValue(), options));
			// eslint-disable-next-line no-empty
		} catch (error) {}
	};
	editor.onDidChangeModelContent(() => {
		setOutput();
	});

	window.addEventListener('resize', () => {
		editor.layout();
		output.layout();
	});
}

const v = init(defaultCode, vc2cConfig);

console.log(v);
