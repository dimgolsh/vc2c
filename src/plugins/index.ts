import type ts from 'typescript';
import { Vc2cOptions } from '../options';
import { ASTConvertPlugins, ASTResult, ASTConverter, ASTResultKind } from './types';
import { copySyntheticComments, addTodoComment, convertNodeToASTResult } from '../utils';
import { log } from '../debug';
import { convertObjName } from './vue-class-component/object/ComponentName';
import { convertObjI18n } from './vue-class-component/object/I18n';
import { convertObjProps } from './vue-class-component/object/Prop';
import { convertObjData } from './vue-class-component/object/Data';
import { convertName, mergeName } from './vue-class-component/ComponentName';
import { convertModel } from './vue-property-decorator/Model';
import { convertProp, mergeProps } from './vue-property-decorator/Prop';
import { convertDomRef } from './vue-property-decorator/DomRef';
import { convertData } from './vue-class-component/Data';
import { convertGetter, convertSetter, mergeComputed } from './vue-class-component/Computed';
import { convertIntervalHook } from './vue-class-component/IntervalHook';
import { convertWatch } from './vue-property-decorator/Watch';
import { convertEmitMethod } from './vue-property-decorator/Emit';
import { convertMethod } from './vue-class-component/Method';
import { removeThisAndSort } from './removeThisAndSort';
import { convertRender } from './vue-class-component/Render';
import { convertInject } from './vue-property-decorator/Inject';
import { convertProvide } from './vue-property-decorator/Provide';
import { addI18nCompos } from './addI18nCompos';
import { addRefs } from './addRefs';
import { convertComponents } from './vue-class-component/object/Components';
import { addRoutesCompos } from './addRoutesCompos';
import { convertValidate, mergeValidate, validateGet } from './vue-property-decorator/Validate';
import { convertExtends } from './vue-class-component/Extends';

export function getDefaultPlugins(tsModule: typeof ts): ASTConvertPlugins {
	return {
		[tsModule.SyntaxKind.Decorator]: {
			[tsModule.SyntaxKind.PropertyAssignment]: [convertObjName, convertObjProps, convertComponents],
			[tsModule.SyntaxKind.MethodDeclaration]: [convertObjData, convertIntervalHook],
			[tsModule.SyntaxKind.ShorthandPropertyAssignment]: [convertObjI18n],
		},
		[tsModule.SyntaxKind.Identifier]: [convertName],
		[tsModule.SyntaxKind.HeritageClause]: [
			convertExtends
		],
		[tsModule.SyntaxKind.PropertyDeclaration]: [
			convertModel,
			convertValidate,
			convertProp,
			convertDomRef,
			convertProvide,
			convertInject,
			convertData,

		],
		[tsModule.SyntaxKind.GetAccessor]: [convertGetter],
		[tsModule.SyntaxKind.SetAccessor]: [convertSetter],
		[tsModule.SyntaxKind.MethodDeclaration]: [
			convertRender,
			convertIntervalHook,
			convertWatch,
			convertEmitMethod,
			convertMethod,
		],
		after: [mergeName, mergeProps, mergeComputed, addRefs, addI18nCompos, addRoutesCompos, mergeValidate, removeThisAndSort],
	};
}

export function getDecoratorArgumentExpr(tsModule: typeof ts, node: ts.Node): ts.ObjectLiteralExpression | undefined {
	if (tsModule.isCallExpression(node)) {
		if (node.arguments.length > 0) {
			return node.arguments[0] as ts.ObjectLiteralExpression;
		}
	}

	return undefined;
}

export interface Clause {
	named: Set<string>;
	default?: string;
}

const importMap = new Map<string, Clause>();
export const setupKeys = new Set<string>();

export function getASTResults(
	node: ts.ClassDeclaration,
	options: Vc2cOptions,
	program: ts.Program,
): ASTResult<ts.Node>[] {
	const tsModule = options.typescript;
	const converterPlugins = options.plugins;

	let astResults: ASTResult<ts.Node>[] = [];
	node.forEachChild((child) => {
		if (tsModule.isDecorator(child)) {
			const objExpr = getDecoratorArgumentExpr(tsModule, child.expression);
			if (objExpr) {
				objExpr.forEachChild((property) => {
					if (property.kind in converterPlugins[tsModule.SyntaxKind.Decorator]) {
						const objConverters = ((converterPlugins[tsModule.SyntaxKind.Decorator] as unknown) as {
							[index: number]: Array<ASTConverter<ts.Node>>;
						})[property.kind];
						let converted = false;
						for (const converter of objConverters) {
							const result = converter(property, options, program);
							if (result) {
								astResults.push(...result);
								converted = true;
								break;
							}
						}
						if (!converted) {
							astResults.push(convertNodeToASTResult(tsModule, property));
						}
					}
				});
			}
		} else {
			if (child.kind in converterPlugins) {
				const converters = ((converterPlugins as unknown) as { [index: number]: Array<ASTConverter<ts.Node>> })[
					child.kind
					];
				for (const converter of converters) {
					const result = converter(child, options, program);

					if (result) {
						astResults.push(...result);
						break;
					}
				}
			}
		}
	});

	for (const fn of converterPlugins.after) {
		astResults = fn(astResults, options, program);
	}

	return astResults;
}

export function convertASTResultToSetupFn(
	astResults: ASTResult<ts.Node>[],
	options: Vc2cOptions,
): ts.MethodDeclaration {
	const tsModule = options.typescript;

	const returnStatement = addTodoComment(
		tsModule,
		tsModule.createReturn(
			tsModule.createObjectLiteral([
				...astResults
					.filter((el) => el.kind === ASTResultKind.COMPOSITION)
					.reduce((array, el) => array.concat(el.attributes), [] as string[])
					.map((el) => tsModule.createShorthandPropertyAssignment(tsModule.createIdentifier(el), undefined)),
			]),
		),
		'Please remove unused return variable',
		false,
	);

	const emitNode = tsModule.createObjectBindingPattern([
		tsModule.createBindingElement(undefined, undefined, tsModule.createIdentifier('emit'), undefined),
	]);

	const getSetupParams = () => {
		if (setupKeys.has('emit') && setupKeys.has('props')) {
			return [
				tsModule.createParameter(
					undefined,
					undefined,
					undefined,
					tsModule.createIdentifier(options.setupPropsKey),
					undefined,
					undefined,
					undefined,
				),
				tsModule.createParameter(undefined, undefined, undefined, emitNode, undefined, undefined, undefined),
			];
		}

		if (!setupKeys.has('emit') && setupKeys.has('props')) {
			return [
				tsModule.createParameter(
					undefined,
					undefined,
					undefined,
					tsModule.createIdentifier(options.setupPropsKey),
					undefined,
					undefined,
					undefined,
				),
			];
		}

		if (setupKeys.has('emit') && !setupKeys.has('props')) {
			return [
				tsModule.createParameter(
					undefined,
					undefined,
					undefined,
					tsModule.createIdentifier('_'),
					undefined,
					undefined,
					undefined,
				),
				tsModule.createParameter(undefined, undefined, undefined, emitNode, undefined, undefined, undefined),
			];
		}

		return [];
	};

	return tsModule.createMethod(
		undefined,
		undefined,
		undefined,
		tsModule.createIdentifier('setup'),
		undefined,
		undefined,
		getSetupParams(),
		undefined,
		tsModule.createBlock(
			[
				...(astResults
					.filter((el) => el.kind === ASTResultKind.COMPOSITION)
					.map((el) => el.nodes)
					.reduce((array, el) => array.concat(el), []) as ts.Statement[]),
				returnStatement,
			],
			true,
		),
	);
}

export const clearImport = () => importMap.clear();
export const clearSetupKeys = () => setupKeys.clear();

export const addImport = (key: string, value: string) => {
	if (!importMap.has(key)) {
		importMap.set(key, { named: new Set() });
	}
	const temp = importMap.get(key)!;
	temp.named.add(value);
	importMap.set(key, temp);
};

export function convertASTResultToImport(
	astResults: ASTResult<ts.Node>[],
	options: Vc2cOptions,
): ts.ImportDeclaration[] {
	const tsModule = options.typescript;

	for (const result of astResults) {
		for (const importInfo of result.imports) {
			const key: string = 'external' in importInfo ? importInfo.external : importInfo.path;
			const temp: Clause = importMap.get(key) ?? { named: new Set() };
			if (!('default' in temp) && 'default' in importInfo) {
				temp.default = importInfo.default;
			}
			for (const named of importInfo.named || []) {
				temp.named.add(named);
			}
			importMap.set(key, temp);
		}
	}

	addImport('vue', 'defineComponent');

	return Array.from(importMap).map((el) => {
		const [key, clause] = el;
		return tsModule.createImportDeclaration(
			undefined,
			undefined,
			tsModule.createImportClause(
				clause.default ? tsModule.createIdentifier(clause.default) : undefined,
				tsModule.createNamedImports(
					[...clause.named].map((named) => tsModule.createImportSpecifier(undefined, tsModule.createIdentifier(named))),
				),
			),
			tsModule.createStringLiteral(key),
		);
	});
}

export function runPlugins(node: ts.ClassDeclaration, options: Vc2cOptions, program: ts.Program): ts.Statement[] {
	const tsModule = options.typescript;
	log('Start Run ASTPlugins');
	const results = getASTResults(node, options, program);
	log('Finished ASTPlugins');

	log('Make setup function');
	const setupFn = convertASTResultToSetupFn(results, options);
	log('Make default export object');
	const exportDefaultExpr = tsModule.createCall(tsModule.createIdentifier('defineComponent'), undefined, [
		tsModule.createObjectLiteral(
			[
				...(results
					.filter((el) => el.kind === ASTResultKind.OBJECT)
					.map((el) => el.nodes)
					.reduce((array, el) => array.concat(el), []) as ts.PropertyAssignment[]),
				setupFn,
			],
			true,
		),
	]);

	const exportAssignment = copySyntheticComments(
		tsModule,
		tsModule.createExportAssignment(undefined, undefined, undefined, exportDefaultExpr),
		node,
	);

	log('Make ImportDeclaration');
	const importDeclaration = convertASTResultToImport(results, options);

	return [...importDeclaration, exportAssignment];
}
