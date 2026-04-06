import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GridPiece')
export class GridPiece extends Component {
    @property({ tooltip: "Match this with GameManager keys: green, red, darkBlue" })
    public colorId: string = "green"; // Set this in each prefab's Inspector
    
    public row: number = 0;
    public col: number = 0;
}