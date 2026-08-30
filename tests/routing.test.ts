import { describe, expect, test } from 'vitest';
import { matchPath } from '../src/utils/routing';

describe('Routing utils', () => {
    test('static paths', () => {
        expect(matchPath('/users', '/users')).toEqual({ matchedText: '/users', remainingPath: '', params: {} });
        expect(matchPath('/users', '/users/')).toEqual({ matchedText: '/users', remainingPath: '/', params: {} });
        expect(matchPath('/users', '/users/42')).toEqual({ matchedText: '/users', remainingPath: '/42', params: {} });
        expect(matchPath('/users', '/users-extra')).toEqual(null);
        expect(matchPath('/us', '/users')).toEqual(null);
        expect(matchPath('/a/b/c', '/a/b/c')).toEqual({ matchedText: '/a/b/c', remainingPath: '', params: {} });
        expect(matchPath('/a/b/c', '/a/b/c/d')).toEqual({ matchedText: '/a/b/c', remainingPath: '/d', params: {} });
        expect(matchPath('/', '/')).toEqual({ matchedText: '/', remainingPath: '', params: {} });
        expect(matchPath('', '/anything')).toEqual(null);
        expect(matchPath('/home', '/about')).toEqual(null);
    });

    test('dynamic paths', () => {
        expect(matchPath('/user/:id', '/user/42')).toMatchObject({params: { id: '42' }});
        expect(matchPath('/:a/:b', '/hello/preffx')).toMatchObject({params: {a: 'hello', b: 'preffx'}});
        expect(matchPath('/user/:id/post', '/user/42/post')).toMatchObject({params: {id: '42' }});
        expect(matchPath('/:a', '/hello/preffx/tests')).toMatchObject({params: {a: 'hello' }});
        expect(matchPath('/user/:id', '/user/')).toEqual(null);
    });

    test('optional params', () => {
        expect(matchPath('/:lang?/home', '/en/home')).toMatchObject({params: {lang: 'en'}});
        expect(matchPath('/:lang?/home', '/home')).toMatchObject({params: {lang: ''}});
        expect(matchPath('/user/:id?', '/user/99')).toMatchObject({params: {id: '99'}});
        expect(matchPath('/user/:id?', '/user')).toMatchObject({params: {id: '' }});
        expect(matchPath('/user/:id?/post', '/user/5/post')).toMatchObject({params: { id: '5'}});
        expect(matchPath('/user/:id?/post', '/user/post')).toMatchObject({params: { id: '' }});
        expect(matchPath('/user/:id?', '/user/')).toMatchObject({params: { id: ''}});
    });

    test('splat', () => {
        expect(matchPath('*', '/any/path/here')).toMatchObject({params: { '*': '/any/path/here' }});
        expect(matchPath('/files/*', '/files/docs/readme.txt')).toMatchObject({params: { '*': 'docs/readme.txt' }});
        expect(matchPath('/files/*', '/files/')).toMatchObject({params: { '*': '' }});
        expect(matchPath('/files/*', '/files')).toEqual(null);
        expect(matchPath('/a/*/c', '/a/x/c')).toEqual(null);     // * not at end — not a wildcard
        expect(matchPath('/a/*/c', '/a/*/c')).toMatchObject({ matchedText: '/a/*/c' }); // literal match
    });

    test('special characters', () => {
        expect(matchPath('/file.txt', '/file.txt')).toMatchObject({ matchedText: '/file.txt' });
        expect(matchPath('/c++', '/c++')).toMatchObject({ matchedText: '/c++' });
        expect(matchPath('/func(123)',  '/func(123)')).toMatchObject({ matchedText: '/func(123)' });
        expect(matchPath('/price/$5', '/price/$5')).toMatchObject({ matchedText: '/price/$5' });
        expect(matchPath('/path/[abc]', '/path/[abc]')).toMatchObject({ matchedText: '/path/[abc]' });
        expect(matchPath('/path/{x,y}', '/path/{x,y}')).toMatchObject({ matchedText: '/path/{x,y}' });
        expect(matchPath('/a^b', '/a^b')).toMatchObject({ matchedText: '/a^b' });
        expect(matchPath('/a|b', '/a|b')).toMatchObject({ matchedText: '/a|b' });
        expect(matchPath('/a?b', '/a?b')).toMatchObject({ matchedText: '/a?b' });
    });

    test('URI decoding', () => {
        expect(matchPath('/user/:id', '/user/%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82')).toMatchObject({ params: { id: 'привет'} });
        expect(matchPath('/path/:file', '/path/file%20name.txt')).toMatchObject({ params: { file: 'file name.txt' } });
    });
});
