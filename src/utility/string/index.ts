
export function startsWith(strbase: string, strpart: string): boolean {
    return strbase.slice(0, strpart.length) === strpart;
}
