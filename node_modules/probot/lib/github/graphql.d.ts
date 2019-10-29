import { GitHubAPI, Variables } from './';
export interface GraphQLError {
    message: string;
    locations?: Array<{
        line: number;
        column: number;
    }>;
    path?: Array<string | number>;
    extensions?: {
        [key: string]: any;
    };
}
export declare class GraphQLQueryError extends Error {
    errors: GraphQLError[];
    query: string;
    variables: Variables;
    data: any;
    constructor(errors: GraphQLError[], query: string, variables: Variables, data: any);
}
export declare function addGraphQL(client: GitHubAPI): void;
