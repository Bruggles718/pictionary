export class Message {
    public m_message : string;
    public m_color : string;
    public m_backgroundColor : string;
    constructor(i_message : string) {
        this.m_message = i_message;
        this.m_color = "txplain";
        this.m_backgroundColor = 'bgplainv1';
    }

    public setColor(i_color : string) {
        this.m_color = i_color;
    }

    public setBackgroundColor(i_color : string) {
        this.m_backgroundColor = i_color;
    }

    public getMessage() : string {
        return this.m_message;
    }
}