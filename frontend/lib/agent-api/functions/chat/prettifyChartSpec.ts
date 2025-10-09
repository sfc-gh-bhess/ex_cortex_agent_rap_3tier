"use client"

import { TopLevelSpec } from "vega-lite";

export function prettifyChartSpec(chartSpec: TopLevelSpec & { width: string | number, height: number }) {
    const newSpec = structuredClone(chartSpec);

    newSpec.width = 1000;
    newSpec.height = 300;
    newSpec.config = {
        "range": {
            "category": [
                "hsla(216, 81%, 50%, 1)",
                "hsla(47, 100%, 46%, 1)",
                "hsla(162, 53%, 55%, 1)",
                "hsla(351, 83%, 45%, 1)",
                "hsla(250, 88%, 65%, 1)",
                "hsla(25, 100%, 56%, 1)",
                "hsla(194, 100%, 72%, 1)",
                "hsla(284, 100%, 68%, 1)"
            ]
        },
        "axis": {
            "labelColor": "hsla(221, 18%, 44%, 1)",
            "titleColor": "hsla(221, 18%, 44%, 1)"
        },
        "legend": {
            "labelColor": "hsla(221, 18%, 44%, 1)",
            "titleColor": "hsla(221, 18%, 44%, 1)"
        },
        "text": {
            "fill": "hsla(221, 18%, 44%, 1)"
        }
    }

    return newSpec;
}