const PALLETTE = [
    "#E1CE7A", "#FBFFB9", "#FDD692", "#EC7357",
    "#754F44", "#1C448E", "#6F8695", "#CEC288",
    "#55D6BE", "#FC6471", "#01BAEF", "#20BF55",
    "#FF57BB", "#73877B", "#47682C", "#DDA15E"
]

export const getColorFromString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i ++){
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALLETTE.length;
    return PALLETTE[index];
}