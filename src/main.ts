import { convert } from './index';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import * as monaco from 'monaco-editor'
import { ScriptTarget } from 'typescript';
console.log(1);

const defaultCode = `import { Component, Vue } from 'common/vue';
import i18n from './i18n';
import { inject } from 'common/di';
import { INotificationModel } from '@/services/notifications';
import { ScText } from '@smartcat/design-system';

@Component({ components: { NotificationTemplate, MdButton } })
export default class Notification extends Vue {
	@Prop({ type: Object, required: true })
	public value: INotificationModel;

    @Prop(Array)
	errors: IQAErrorModel[];

    @Prop({ type: Array, required: true })
	tqs: IQAErrorModel[];

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

function init (code: string, options: Partial<Vc2cOptions>) {
	self.MonacoEnvironment = {
		getWorker (_, label) {
			if (label === 'typescript' || label === 'javascript') {
				return new tsWorker();
			}
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
