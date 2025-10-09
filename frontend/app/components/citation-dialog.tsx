import { useState } from "react";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import ReactMarkdown from "react-markdown";
import { citationsColorMap } from "../functions/postProcessAgentText";

export interface CitationDialogProps {
    citationsNumber: number;
    citation: string;
}

export function CitationDialog(props: CitationDialogProps) {
    const { citationsNumber, citation } = props;

    const [open, setOpen] = useState(false);

    return (
        <>
            <span onClick={() => setOpen(true)} className={`px-3 py-1 rounded-xl ${citationsColorMap[citationsNumber][0]}  ${citationsColorMap[citationsNumber][1]} cursor-pointer text-sm font-medium`}>{citationsNumber}</span>
            <Dialog
                hideBackdrop={true}
                onClose={() => setOpen(false)}
                aria-labelledby="customized-dialog"
                open={open}
            >
                <DialogContent>
                    <ReactMarkdown>{citation}</ReactMarkdown>
                </DialogContent>
            </Dialog>
        </>
    )
}