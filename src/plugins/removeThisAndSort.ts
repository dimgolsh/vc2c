import { ASTTransform, ASTResult, ReferenceKind, ASTResultKind } from './types';
import type ts from 'typescript';
import { addTodoComment, convertContextKey, convertContextWithImport, convertI18nKey } from '../utils';
import { addImport, setupKeys } from '.';

export const removeThisAndSort: ASTTransform = (astResults, options) => {
	const tsModule = options.typescript;
	const getReferences = (reference: ReferenceKind) =>
		astResults
			.filter((el) => el.reference === reference)
			.map((el) => el.attributes)
			.reduce((array, el) => array.concat(el), []);

	const refVariables = getReferences(ReferenceKind.VARIABLE_VALUE);
	const domeRefVariables = getReferences(ReferenceKind.VARIABLE_NON_NULL_VALUE);
	const propVariables = getReferences(ReferenceKind.PROPS);
	const variables = getReferences(ReferenceKind.VARIABLE);

	let dependents: string[] = [];

	const transformer: () => ts.TransformerFactory<ts.Node> = () => {
		return (context) => {
			const removeThisVisitor: ts.Visitor = (node) => {
				if (tsModule.isPropertyAccessExpression(node)) {
					if (node.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
						const propertyName = node.name.getText();
						if (refVariables.includes(propertyName)) {
							dependents.push(propertyName);
							return tsModule.createPropertyAccess(
								tsModule.createIdentifier(propertyName),
								tsModule.createIdentifier('value'),
							);
						} else if (domeRefVariables.includes(propertyName)) {
							dependents.push(propertyName);
							return tsModule.createNonNullExpression(
								tsModule.createPropertyAccess(
									tsModule.createIdentifier(propertyName),
									tsModule.createIdentifier('value'),
								),
							);
						} else if (propVariables.includes(propertyName)) {
							dependents.push(propertyName);
							setupKeys.add('props');
							return tsModule.createPropertyAccess(
								tsModule.createIdentifier(options.setupPropsKey),
								tsModule.createIdentifier(propertyName),
							);
						} else if (variables.includes(propertyName)) {
							dependents.push(propertyName);
							return tsModule.createIdentifier(propertyName);
						} else {
							if (propertyName === '$emit') {
								setupKeys.add('emit');
							}

							// emit
							const convertKey = convertContextKey(propertyName);
							if (convertKey) {
								return tsModule.createIdentifier(convertKey);
							}

							// i18n
							const i18nkey = convertI18nKey(propertyName);
							if (i18nkey) {
								return tsModule.createIdentifier(i18nkey);
							}

							// watch, nextTick
							const convertWithImport = convertContextWithImport(propertyName);

							if (convertWithImport) {
								addImport(convertWithImport.import.key, convertWithImport.import.path);
								return tsModule.createIdentifier(convertWithImport.key);
							}

							//$v
							if (propertyName === '$v') {
								return tsModule.createIdentifier('$v.value');
							}

							return addTodoComment(
								tsModule,
								tsModule.createPropertyAccess(
									tsModule.createPropertyAccess(
										tsModule.createIdentifier(options.setupContextKey),
										tsModule.createIdentifier('root'),
									),
									tsModule.createIdentifier(propertyName),
								),
								'Check this convert',
								true,
							);
						}
					}

					if (tsModule.isPropertyAccessExpression(node.expression) && node.expression.name.getText() === '$refs') {
						const propertyName = node.name.getText();

						if (refVariables.includes(propertyName)) {
							dependents.push(propertyName);
							return tsModule.createPropertyAccess(
								tsModule.createIdentifier(propertyName),
								tsModule.createIdentifier('value'),
							);
						}
					}
					return tsModule.visitEachChild(node, removeThisVisitor, context);
				}
				return tsModule.visitEachChild(node, removeThisVisitor, context);
			};

			return (node) => tsModule.visitNode(node, removeThisVisitor);
		};
	};

	const transformResults = astResults.map((astResult) => {
		if (astResult.kind === ASTResultKind.OBJECT) {
			return {
				...astResult,
				nodeDependents: [],
			};
		}
		dependents = [];

		const nodes = tsModule.transform(astResult.nodes, [transformer()], { module: tsModule.ModuleKind.ESNext })
			.transformed;

		const nodeDependents = dependents.slice();

		return {
			...astResult,
			nodes,
			nodeDependents,
		};
	});

	const astResultNoDependents = transformResults.filter((el) => el.nodeDependents.length === 0);
	let otherASTResults = transformResults.filter((el) => el.nodeDependents.length !== 0);

	let result: ASTResult<ts.Node>[] = [...astResultNoDependents];
	const resultHaveDependents = astResultNoDependents
		.map((el) => el.attributes)
		.reduce((array, el) => array.concat(el), []);
	do {
		let hasPush = false;
		otherASTResults = otherASTResults.filter((el) => {
			if (el.nodeDependents.every((dependent) => resultHaveDependents.includes(dependent))) {
				result.push(el);
				hasPush = true;
				return false;
			} else {
				return true;
			}
		});
		if (!hasPush) {
			result = result.concat(otherASTResults);
			break;
		}
	} while (result.length < astResults.length);
	return result;
};
