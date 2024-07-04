import { ASTConverter, ASTResultKind, ReferenceKind } from '../../types';
import type ts from 'typescript';

export const convertObjI18n: ASTConverter<ts.ShorthandPropertyAssignment> = (node) => {
	if (node.name.getText() === 'i18n') {
		return [{
			tag: 'Obj-I18n',
			kind: ASTResultKind.OBJECT,
			imports: [],
			reference: ReferenceKind.NONE,
			attributes: [],
			nodes: [node] as ts.ShorthandPropertyAssignment[],
		}];
	}

	return false;
};
