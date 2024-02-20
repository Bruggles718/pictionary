export class Player {
    public m_id : string;
    public m_name : string;
    public m_currentRoomId : string;

    public get ID() {
        return this.m_id;
    }

    public get Name() {
        return this.m_name;
    }

    constructor(i_id : string, i_name : string) {
        this.m_id = i_id;
        this.m_name = i_name;
    }

    public setCurrentRoomId(i_roomId : string) {
        this.m_currentRoomId = i_roomId;
    }
}