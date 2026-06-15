export class Camera {

    constructor() {

        this.x = 0;
        this.y = 0;
    }

    update(player, canvas) {

        this.x =
            player.x - canvas.width / 2;

        this.y =
            player.y - canvas.height * 0.6;
    }
}
