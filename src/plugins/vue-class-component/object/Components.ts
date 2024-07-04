import { ASTConverter, ASTResultKind, ReferenceKind } from '../../types';
import type ts from 'typescript';

export const convertComponents: ASTConverter<ts.PropertyAssignment> = (node) => {
	if (node.name.getText() === 'components') {
		return [{
			tag: 'Obj-components',
			kind: ASTResultKind.OBJECT,
			imports: [],
			reference: ReferenceKind.NONE,
			attributes: [],
			nodes: [node] as ts.PropertyAssignment[],
		}];
	}

	return false;
};
