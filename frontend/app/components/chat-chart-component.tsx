import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TopLevelSpec } from "vega-lite";

const VegaLite = dynamic(() => import("react-vega").then((m) => m.VegaLite), {
    ssr: false,
});

export interface ChatChartComponentProps {
    chartSpec: TopLevelSpec;
}

export function ChatChartComponent(props: ChatChartComponentProps) {
    const { chartSpec } = props;

    return (
        <motion.div
            className="w-full mx-auto max-w-3xl pr-4 pl-0 group/message"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0 } }}
        >
            <VegaLite spec={chartSpec} />
        </motion.div>
    )
}